# NHL Play by Play -> Elasticsearch

Sucks down data from live.nhl.com.  E.g., 
http://live.nhl.com/GameData/20142015/2014021136/PlayByPlay.json

Imports it into Elasticsearch by season or by game.

Preparing Elasticsearch:

1. Install NodeJS 
2. Run # npm install
2. Run # ./clean.sh to erase any previous data and re-prepare the index
3. Run # go.js as shown below

Usage:
```
node go.js <season> [gameid]
```

Example, Import the whole 2014-2015 season:
```
node go.js 2014
```

Example, Import a specific game (once you know the id).  This is specific for updating real time during a game.
```
node go.js 2014 2014030416
```

Top Hitters, Shooters, Scorers & Penalties per Game
![Game Data](https://github.com/PhaedrusTheGreek/nhl-stats-elasticsearch/blob/master/game.png)

All Season Top Hitters, Shooters, and Scorers against the Habs
![Against Data](https://github.com/PhaedrusTheGreek/nhl-stats-elasticsearch/blob/master/against.png)
