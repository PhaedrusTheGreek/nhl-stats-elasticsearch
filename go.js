var request = require("request")
var forEachAsync = require('futures').forEachAsync;

var targetEndpoint = 'http://localhost:9200';
var targetIndex = 'nhl';
var targetType = 'play';

var totalPlays = 0;

var debug = false;

// Required Season
var arg_season = parseInt(process.argv[2]);

// Options Game ID
var arg_game = process.argv[3];

var season = "" + arg_season + (arg_season+1);
var url = "http://live.nhl.com/GameData/SeasonSchedule-" + season + ".json";


function BoxScore(){

    this._data = {

        "home" : {
            roster : { skaters: {}, goalies: {}},
            stats : {}
        },

        away : {
            roster : { skaters: {}, goalies: {}},
            stats : {}
        },

        goals : {}

    };

};

BoxScore.prototype.load = function(data){

    this._data.home.stats = data.teamStats.home;
    this._data.away.stats = data.teamStats.away;

    var _data = this._data;

    // Key Roster by Sweater Numberin
    ["home", "away"].forEach(function(side) {
        ["skaters", "goalies"].forEach(function(type) {
            for (var s = 0; s < data.rosters[side][type].length; s++) {
                var guy = data.rosters[side][type][s];
                _data[side]['roster'][type][guy.num] = guy;
            }
        });
    });

    //Key Goals by ID
    for (var p=0; p<data.goalSummary.length; p++){
        if (!data.goalSummary[p].goals) continue;
        for (var g=0; g<data.goalSummary[p].goals.length; g++){

            var goal = data.goalSummary[p].goals[g];
            _data.goals[goal.id] = goal;
        }
    }

}

BoxScore.prototype.enrich = function(play, isHomeTeamPlay) {

    if (isHomeTeamPlay) {

        if (this._data.home.roster.skaters[play.sweater]) {
            play.player = this._data.home.roster.skaters[play.sweater]
        }
    } else {
        if (this._data.away.roster.skaters[play.sweater]) {
            play.player = this._data.away.roster.skaters[play.sweater]
        }
    }

    if (play.type == "Goal") {

        var goal = this._data.goals[play.eventid];

        if (!goal) {
            play.review_no_goal = true;
            return;
        }

        if (isHomeTeamPlay) {
            play.goalie = this._data.away.roster.goalies[goal.p2];
        } else {
            play.goalie = this._data.home.roster.goalies[goal.p2];
        }


    }

	return;

}


var seasonRoster = {};

function updateSeasonRoster(teamId, seasonRosterData){

    seasonRoster[teamId] = {};

    ["skater", "goalie"].forEach(function(playerType) {
        var categories = seasonRosterData[playerType+'Categories'].split(',');
        for (var d = 0; d < seasonRosterData[playerType+'Data'].length; d++) {
            var thisPlayer = seasonRosterData[playerType+'Data'][d];
            var points = thisPlayer.data.split(',')
            seasonRoster[teamId][thisPlayer.id] = {};
            for (var c = 0; c < categories.length; c++) {
                seasonRoster[teamId][thisPlayer.id][categories[c].trim()] = points[c].trim();
            }
        }
    });

}


function updatePlayWithSeasonRosterData(play, isHomeTeamPlay) {

    play.aoi_detail=[];
    for (i=0; i<play.aoi.length;i++) {
        play.aoi_detail.push(seasonRoster[play.game.a][play.aoi[i]]);
    }

    play.hoi_detail=[];
    for (i=0; i<play.hoi.length;i++) {
        play.hoi_detail.push(seasonRoster[play.game.h][play.hoi[i]]);
    }

    if (isHomeTeamPlay) {
        play.pid_detail = seasonRoster[play.game.h][play.pid];
    } else {
        play.pid_detail = seasonRoster[play.game.a][play.pid];
    }

    return;

}


request({
    url: url,
    json: true
}, function (error, response, body) {

	if (error || response.statusCode !== 200) {
		console.log("Could not get season " + season + ": " + error);
		process.exit(1);
	}


	var games = body;
	forEachAsync(games, function (nextGame, game, index, array) {

		if (arg_game && game.id != arg_game) {
		   nextGame();
		   return;
		}


        // First let's download the season roster if we don't already have it (for either team)
        forEachAsync([game.a, game.h], function (nextTeamId, teamId, index, array) {

            if (!seasonRoster[teamId]) {

                // Also wish i had...
                //var seasonRosterURL = "http://nhlwc.cdnak.neulion.com/fs1/nhl/league/teamroster/" + teamId + "/iphone/clubroster.json"

                var seasonRosterURL = "http://nhlwc.cdnak.neulion.com/fs1/nhl/league/playerstatsline/"+season+"/2/"+teamId+"/iphone/playerstatsline.json"
                request({
                    url: seasonRosterURL,
                    json: true
                }, function (error2, response2, body2) {

                    if (error2 || response2.statusCode !== 200 || !body2) {
                        console.log("Could not get game Season Roster @ " + seasonRosterURL + ": " + error2);
                        nextGame();
                        return;
                    }

                    updateSeasonRoster(teamId, body2);
                    nextTeamId();

                });

            } else {
                nextTeamId();
            }

        }).then(function() {


            var est = game.est;
            var game_date = Date.parse(est);

            var url = "http://live.nhl.com/GameData/" + season + "/" + game.id + "/gc/gcbx.jsonp";
            if (debug) console.log(url);


            request({
                url: url,
                dataType: 'jsonp',
            }, function (error, response, body) {

                if (error || response.statusCode !== 200 || !body) {
                    console.log("Could not get game BoxScore @ " + url + ": " + error);
                    nextGame();
                    return;
                }

                var GCBX = new BoxScore();

                eval(body) // calls GCBX.load();

                var url = "http://live.nhl.com/GameData/" + season + "/" + game.id + "/PlayByPlay.json";
                if (debug) console.log(url);

                process.stdout.write(".");

                var year = game.est.substring(0, 4);
                var month = game.est.substring(4, 6);
                var day = game.est.substring(6, 8);
                var hours = game.est.substring(9, 11);
                var minutes = game.est.substring(12, 14);
                var seconds = game.est.substring(15, 17);
                var gameDate = new Date(year, month - 1, day, hours, minutes, seconds);

                var gameBulk = "";

                request({
                    url: url,
                    json: true
                }, function (error, response, body) {

                    if (error || response.statusCode !== 200 || !body || !body.data) {
                        console.log("Could not get game @ " + url + ": " + error);
                        nextGame();
                        return;
                    }

                    var awayteamid = body.data.game.awayteamid;
                    var hometeamid = body.data.game.hometeamid;
                    var awayteamnick = body.data.game.awayteamnick;
                    var hometeamnick = body.data.game.hometeamnick;

                    var teamnick = {};
                    teamnick[awayteamid] = awayteamnick;
                    teamnick[hometeamid] = hometeamnick;

                    var opposing = {};
                    opposing[awayteamid] = hometeamnick;
                    opposing[hometeamid] = awayteamnick;

                    for (var p in body.data.game.plays.play) {

                        var play = body.data.game.plays.play[p];
                        var play_minutes = parseInt(play.time.substring(0, 2)) + ((play.period - 1) * 20);
                        var play_seconds = parseInt(play.time.substring(3, 5));
                        var playDate = new Date(gameDate.getTime())
                        playDate.setMinutes(playDate.getMinutes() + play_minutes);
                        playDate.setSeconds(playDate.getSeconds() + play_seconds);
                        play.timestamp = playDate.toISOString();
                        play.teamnick = teamnick[play.teamid];
                        play.teamnick_opposing = opposing[play.teamid];
                        play.awayteamid = awayteamid;
                        play.hometeamid = hometeamid;
                        play.game = game;

                        if (play.ycoord && play.xcoord) {
                            play.location = [play.xcoord, play.ycoord];
                        }

                        //Enrich
                        GCBX.enrich(play, play.teamid == hometeamid);

                        //Enrich
                       updatePlayWithSeasonRosterData(play, play.teamid == hometeamid);

                        var unique_play_id = game.id + ":" + play.eventid;

                        totalPlays++;

                        gameBulk += JSON.stringify({"index": {"_id": unique_play_id}}) + "\n";
                        gameBulk += JSON.stringify(play) + "\n";

                    }

                    request.post({
                        headers: {'content-type': 'application/x-www-form-urlencoded'},
                        url: targetEndpoint + '/' + targetIndex + '/' + targetType + '/_bulk',
                        body: gameBulk
                    }, function (err, response, body) {

                        if (err) {
                            console.error('index failed:', err);
                        }
                        var res = JSON.parse(body);

                        if (res.errors){
                            console.log("Some Errors Occurred During Indexing:");
                            for (var i=0;i<res.items.length;i++){
                                if (res.items[i].index.status != 200){
                                    console.log(res.items[i].index);
                                }
                            }
                            console.log("Aborted Indexing due to above errors");
                            process.exit(1);
                        }
                    });

                    // no reason why this has to be synchronized
                    nextGame();

                })

            })

        })


    }).then(function () {
        console.log("\nDone.  Total Plays Read: " + totalPlays);
    });


})




