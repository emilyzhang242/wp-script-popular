let runScriptButton = document.getElementById('runScript');
let posts = document.querySelector('#posts');
let numGoodPosts = document.querySelector('#numGoodPosts');
let wpSite = "https://www.reddit.com/r/WritingPrompts/";
let alarmName = "alarm";
let REFRESH_TIME = 10;
let myAudio = new Audio();        // create the audio object
myAudio.src = "light.mp3";

//want to run the script 
runScriptButton.onclick = function(element) {
	// if is running is true, and we press the button, we want it to stop running, while replacing with a run button
  if ($(this).data("run") == "true") {
    stopRunButton();
    stopScript();
    chrome.storage.sync.set({"running": "false"}, function() {});
    // start the script, but replace it with a stop running button
  } else {
    runButton();
    runScript();
    chrome.storage.sync.set({"running": "true"}, function() {});
  }
}

// script is now running
function runButton() {
  $(runScriptButton).html("Stop Script");
    $(runScriptButton).removeClass("btn-success");
    $(runScriptButton).addClass("btn-danger");
    $(runScriptButton).data("run", "true");
}

// script is now stopping
function stopRunButton() {
  $(runScriptButton).html("Run Script");
    $(runScriptButton).removeClass("btn-danger");
    $(runScriptButton).addClass("btn-success");
    $(runScriptButton).data("run", "false");
}

function runScript() {
  //update URL to main page in order to run script
  chrome.tabs.getSelected(null, function (tab) {

    chrome.tabs.update(tab.id, {url: wpSite});

      //send message to run script
    chrome.tabs.executeScript(null, {
        file: "content.js"
    }, function() {
      if (chrome.runtime.lastError) {
        console.log('There was an error getting the content.js : \n' + chrome.runtime.lastError.message);
      }
    });
  });
  //clear all alarms before creating a new one
  chrome.alarms.clearAll(function() {
    createAlarm();
    var time = grabTime(true);
    //set new storage time
    chrome.storage.sync.set({"time": time[0]}, function() {
      //
    });
    chrome.storage.sync.set({"writtenTime": time[1]}, function() {
      //
    });
  });
}

// returns an array with the [date object, written object]
function grabTime(refresh) {

  var newDate = new Date();
    //hours, am or pm 
    var period = " ";

    var hours = newDate.getHours();
    if (hours>12) {
      hours-=12; 
      period += "pm";  
    } else {
      if (hours == 0) {hours = 12; }
      period += "am";
    }

    var minutes = "";
    if (newDate.getMinutes() < 10) {
      minutes = "0"+newDate.getMinutes().toString();
    } else {
      minutes = newDate.getMinutes().toString();
    }

    var time = hours.toString()+":"+minutes+period;
    if(refresh) {
      $("#lastRefresh").html(time);
    }

    return [newDate.toString(), time];
}

function stopScript() {
  clearAlarm();
}

/* LISTENERS */

// receives messages from content.js
chrome.runtime.onMessage.addListener(function(request, sender) {

  //key = tab id, value = url
  var tabs = {};
  var newInfo = request.source;

  if (request.action == "getPrelimPossibilities") {
    //update badges + audio
    chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
    var numOfPosts = Object.keys(request.source).length.toString();
    chrome.browserAction.setBadgeText({text: numOfPosts});
    if (numOfPosts > 0) {
      myAudio.play();  
    }

    chrome.storage.sync.set({"info": newInfo}, function() {});
  }
});

/* END OF LISTENERS */

function buildContent(source) {
	let html = "<h3 class='text-center mt-3'>No Posts</h3>";

  if (Object.keys(source).length != 0) {
    html = "";
    $.each(source, function(key, value) {
    html+= "<div class='row post'><div class='col-1'><h3 class='prompt-rank'>";
    html+= value.rank;
    html+= "</h3></div><div class='col-11'><p class='prompt-title'>";
    html+= value.title;
    html+= "</p><div class='stats'><p class='prompt-upvotes'>";
    html+= value.upvotes;
    html+= " Upvotes</p><p class='prompt-hours'>";
    html+= value.time;
    html+= "</p><p class='prompt-comments'>";
    html+= value.comments;
    html+= " Comments</p></div></div></div>";
    });
  }

	posts.innerHTML = html;

  return html;
}

// when the popup loads, we want to update it with the storage information
window.onload = function() {
  updatePopup();
}

/* ON LOAD */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tab.url == ("https://www.reddit.com/r/WritingPrompts/" || "https://www.reddit.com/r/WritingPrompts/rising/")) {
    updatePopup();
  }
});

function updatePopup() {
  chrome.storage.sync.get(['time'], function(result) {
    console.log(timeDiff(grabTime(false)[0], result.time));
      if(timeDiff(grabTime(false)[0], result.time) > REFRESH_TIME) {
        runScript();
      } else {
        chrome.storage.sync.get(['info'], function(inforesult) {
          buildContent(inforesult.info);
        });

        chrome.storage.sync.get(['writtenTime'], function(result2) {
          $("#lastRefresh").html(result2.writtenTime);
        });
      }
    });
}

//don't want to refresh if the time isn't up, in minutes
// either return if we get an actual value, or don't return anything at all
function timeDiff(dt1, dt2) {
  dt1 = Date.parse(dt1);
  dt2 = Date.parse(dt2);
  try {
    var diff =(dt2 - dt1) / 1000;
    diff /= 60;
  } catch(err) {
    return Number.MAX_VALUE;
  }
  return Math.abs(Math.round(diff));
}

/* alarm functionality */
function createAlarm() {
  chrome.alarms.create(alarmName, {periodInMinutes: REFRESH_TIME});
}

function clearAlarm() {
  chrome.alarms.clear(alarmName, function() {
    //
  });
}

chrome.alarms.onAlarm.addListener(function() {
  runScript();
});