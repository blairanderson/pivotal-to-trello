var _ = require('lodash');

var request = require('request');
var async = require('async');
var Trello = require('node-trello');

// MAP TRACKER STATUS TO TRELLO LIST
// accepted, delivered, finished, started, rejected, planned, unstarted, unscheduled
var listsToTracker = {
  // status: idList

  //'unstarted': '546b4c23ac36eb3d928725cf', // Backlog
  // 'started': '5367a06afc26005e60d1e763', // in process
  // 'finished': '5367a0d620609dc039ac3a63', // PR sent
};

// Migrate one board at a time, to make sure they're in the right place
var current_state = 'unstarted';

// TRELLO
// visit("https://trello.com/app-key")
var trelloCreds = {
  boardId: null,
  key: null,
  token: null
};


// TRACKER
var trackerProjectId = null;
var trackerToken = null;


[trelloCreds.boardId, trelloCreds.token, trelloCreds.key, trackerToken, trackerProjectId].forEach(function(dep) {
  if (!dep) {
    throw new Error("Check your Deps!")
  }
});

var t = new Trello(trelloCreds.key, trelloCreds.token);
if (!listsToTracker[current_state]) {
  var message = 'missing trello board for' + current_state;
  t.get('/1/boards/' + trelloCreds.boardId + '/lists', function(error, data) {
    console.log(data);
  });
  console.log(message);
}

function createStory(json, callback) {
  request({
    method: "POST",
    json: json,
    url: "https://www.pivotaltracker.com/services/v5/projects/" + trackerProjectId + "/stories",
    headers: {
      'X-TrackerToken': trackerToken
    }
  }, callback);
}

function writeToPivotal(trelloCards, callback) {
  console.log('writing to pivotal: ', trelloCards.length);
  async.each(trelloCards, function(item, cb) {
    createStory({
      name: item.name,
      description: item.shortUrl + "  \n  " + item.desc,
      current_state: current_state,
      // estimate: 2, ESTIMATE REQUIRED FOR 'started' and 'finished'
    }, function(error, response, body) {
      if (error) {
        console.log(error);
        return cb(error)
      }
      console.log(body);
      cb(null, body);
    });
  }, function(err) {
    if (err) {
      callback(err)
    } else {
      callback(null, "Success")
    }
  });
}


return t.get('/1/boards/' + trelloCreds.boardId + '/cards/', function(error, data) {
  if (data.indexOf("expired") > -1) {
    throw new Error(data);
    return
  }
  var idList, filtered;

  idList = listsToTracker[current_state];

  console.log('cards count:', data.length);

  filtered = _.filter(data, function(card) {
    return card.idList === idList;
  });

  console.log(current_state + " count: ", filtered.length);

  if (filtered && filtered.length > 0) {
    async.map(filtered, function(item, cb) {
      t.get('/1/boards/' + trelloCreds.boardId + '/cards/' + item.id, cb)
    }, function(error, result) {
      if (error) {
        return console.log(error);
      }
      writeToPivotal(result, function(err, res) {
        console.log("writeToPivotal err:", err);
        console.log("writeToPivotal res:", res);
      })
    });
  } else {
    console.log('No Cards for current_state:[' + current_state + ']');
  }
});
