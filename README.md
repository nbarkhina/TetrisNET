# TetrisNET
Online Multiplayer version of my TetrisJS repo. Uses .NET Core 3.1 and SignalR for the backend. You can play it here -

https://neilb.net/tetrisnet/



# Setup

- Running Locally
  - Install the .NET Core SDK version 3.1.4
  - To run
    - `dotnet run` or `dotnet watch run` for hot reload
    - in another terminal
      - `cd wwwroot`
      - `tsc -w`
- Deploying to production
  - run `build_first_time.bat` to pubilsh
    - or `build.ps1` thereafter
  - Configure IIS to allow Websockets
    - windows features -> IIS -> Application Development -> Websocket Protocol
  - Install the .NET Core Hosting Bundle version 3.1.4 if you plan on hosting in IIS
  - Change the URL in script.js if production url is different than `/tetrisnet`
  - Create an IIS App Pool called .NET Core TetrisNet
    - set it to `No Managed Code`


# Single Player
Single player version here

https://github.com/nbarkhina/TetrisJS