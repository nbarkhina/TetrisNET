using System;

namespace TetrisNet
{
    public class Player
    {
        public string Name {get;set;}
        public int PlayerNum {get;set;}
        public string Board {get;set;}
        public bool Connected {get;set;}
        public string IPAddress {get;set;}
        public string GameID {get;set;}
        public int Score {get;set;}
        
        public Player(int playerNum)
        {
            Name = "";
            PlayerNum = playerNum;
            Board = "";
            Connected = false;
            IPAddress = "";
            GameID = "";
            Score = 0;
        }
    }

    public class Game
    {
        public string GameID {get;set;}
        public Player Player1 {get;set;}
        public Player Player2 {get;set;}

        public Game(string gameId)
        {
            GameID = gameId;
            Player1 = new Player(1);
            Player2 = new Player(2);
            Player1.GameID = gameId;
            Player2.GameID = gameId;
        }

    }
}