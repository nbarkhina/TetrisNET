using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;

namespace TetrisNet
{
    public class EmuHub : Hub
    {

        public static List<Game> games = new List<Game>();

        public EmuHub(){

        }

        public string GetIPAddress(){
            string ip = "";
            try{
                foreach(var feature in Context.Features)
                {
                    var value = feature.Value;
                    string key = feature.Key.ToString();

                    if (key=="Microsoft.AspNetCore.Http.Connections.Features.IHttpContextFeature"){

                        Microsoft.AspNetCore.Http.DefaultHttpContext myContext = 
                            value.GetType().GetProperty("HttpContext").GetValue(value) as Microsoft.AspNetCore.Http.DefaultHttpContext;
                        
                        ip = myContext.Connection.RemoteIpAddress.ToString();
                        
                    }
                }
                
            }catch(Exception ex){
                Console.WriteLine(ex.Message + ex.StackTrace);
            }

            return ip;
        }

        public override async Task OnConnectedAsync(){
            
            string ipaddress = GetIPAddress();

            //find an available lobby
            Game availableGame = null;
            foreach(var game in games)
            {
                if (!game.Player1.Connected || !game.Player2.Connected){
                    availableGame = game;
                    break;
                }
            }

            if (availableGame!=null)
            {
                bool newConnected = false;
                if (availableGame.Player1.Connected==false){
                    await Groups.AddToGroupAsync(Context.ConnectionId,availableGame.GameID);
                    availableGame.Player1.Connected = true;
                    availableGame.Player1.IPAddress = ipaddress;
                    availableGame.Player1.Board = "";
                    Context.Items["Player"] = availableGame.Player1;
                    newConnected = true;
                    await Clients.Caller.SendAsync("Connected","Success",availableGame.Player1);
                }
                else if (availableGame.Player2.Connected==false){
                    await Groups.AddToGroupAsync(Context.ConnectionId,availableGame.GameID.ToString());
                    availableGame.Player2.Connected = true;
                    availableGame.Player2.IPAddress = ipaddress;
                    availableGame.Player2.Board = "";
                    Context.Items["Player"] = availableGame.Player2;
                    newConnected = true;
                    await Clients.Caller.SendAsync("Connected","Success",availableGame.Player2);
                }

                if (availableGame.Player1.Connected && availableGame.Player2.Connected && newConnected){
                    await Clients.Group(availableGame.GameID).SendAsync("AllClientsConnected", availableGame.Player1,availableGame.Player2);
                }
            }
            else{ //if no available lobby was found then create a new game
                string gameId = games.Count.ToString();
                var newGame = new Game(gameId);
                games.Add(newGame);
                await Groups.AddToGroupAsync(Context.ConnectionId,newGame.GameID);
                newGame.Player1.Connected = true;
                newGame.Player1.IPAddress = ipaddress;
                newGame.Player1.Board = "";
                Context.Items["Player"] = newGame.Player1;
                await Clients.Caller.SendAsync("Connected","Success",newGame.Player1);

            }
            
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            if (Context.Items["Player"]!=null){
                Player player = (Player)Context.Items["Player"];
                player.Connected = false;

                //inform other clients that player has disconnected
                await Clients.OthersInGroup(player.GameID).SendAsync("ReceiveMessage", "PlayerDisconnected", player.PlayerNum);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task ForceDisconnectAll()
        {
            await Clients.All.SendAsync("Shutdown");
        }

        public async Task StartGame()
        {
            if (Context.Items["Player"]!=null){
                Player player = (Player)Context.Items["Player"];
                await Clients.OthersInGroup(player.GameID).SendAsync("StartGame");
            }
            
        }

        public async Task Lost()
        {
            if (Context.Items["Player"]!=null){
                Player player = (Player)Context.Items["Player"];
                foreach(var game in games)
                {
                    if (player.GameID==game.GameID)
                    {
                        if (player.PlayerNum==1) game.Player2.Score++;
                        if (player.PlayerNum==2) game.Player1.Score++;
                    }
                }
                

                await Clients.Group(player.GameID).SendAsync("GameOver", player.PlayerNum);
            }
        }

        public async Task SendGargabe(int numLines)
        {
            if (Context.Items["Player"]!=null){
                Player player = (Player)Context.Items["Player"];
                await Clients.OthersInGroup(player.GameID).SendAsync("ReceiveGarbage", numLines);
            }
        }


        public async Task SendMessage(string message)
        {
            if (Context.Items["Player"]!=null){
                Player player = (Player)Context.Items["Player"];
                await Clients.OthersInGroup(player.GameID).SendAsync("ReceiveMessage", "Broadcast", message);
            }
        }

        public async Task UpdateBoard(string board)
        {
            if (Context.Items["Player"]!=null){
                Player player = (Player)Context.Items["Player"];
                await Clients.OthersInGroup(player.GameID).SendAsync("ReceiveBoard", board);
            }
        }

        public async Task GetAllGames()
        {
            await Clients.Caller.SendAsync("AllGames", games);
        }
    }
}