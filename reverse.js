var _ = require('lodash');

var request = require('request');
var async = require('async');
var Trello = require('node-trello');

var project = "1295806";
function createStory(story, callback){
  return request({
    method: "POST",
    json: story,
    url: "https://www.pivotaltracker.com/services/v5/projects/"+project+"/stories",
    headers: {
        'X-TrackerToken': 'abcd'
    }
  }, callback);
}

function writeToPivotal(trelloCards, callback){
  async.each(trelloCards, function(item, cb){
    // map pivotal: trello
    createStory({
      name: item.name,
      description: item.shortUrl + "  \n  "+ item.desc,
      current_state: 'unstarted'
    }, cb);

  }, function(err){
    if (err){
      callback(err)
    } else {
      callback(null, "Success")
    }
  });
}

var trelloCreds = {
  // key: "abc",
  // token: "abc",
  // secret: 'abc'
};

var t = new Trello(trelloCreds.key, trelloCreds.token);
var boardId = "fqvY2ld2";

t.get('/1/boards/'+boardId+'/cards/', function(error, data){
  var listTODOid = '546b4c23ac36eb3d928725cf';

  // if (data == "abcd{
    return new Error("data")
  }

  var filtered = _.filter(data, function(card){
    return card.idList === listTODOid
  });

  async.map(filtered, function(item, cb){
    t.get('/1/boards/'+boardId+'/cards/'+item.id, cb)
  }, function(error, result){
    if (error){
      return console.log(error);
    }
    writeToPivotal(result, function(err, res){
      console.log(err)
      console.log(res)
    })
  });
});
