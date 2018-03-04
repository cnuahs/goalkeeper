// GoalKeeper slash command handler for slack...

// POST payloads from slack slash commands contain the following parameter object:
//
//   payload.parameter = {
//     user_name: "~"
//     trigger_id: "~"
//     user_id: "Uxxxxxxxx"
//     team_id: "Txxxxxxxx"
//     response_url: "~"
//     channel_name: "~"
//     token: "~"
//     team_domain: "~"
//     command: "~"
//     channel_id: Cxxxxxxxx
//     text: ""
//   }
//
// POST payloads from clack interactive messages look like this:
//
//   payload = {
//     "type":"interactive_message",
//     "actions": [{"name":"connect","type":"button","value":"connect"}],
//     "callback_id":"connect_button",
//     "team":{"id":"T446ZHZCM","domain":"marmolab"},
//     "channel":{"id":"C9H2SGDAB","name":"zapier"},
//     "user":{"id":"U444CRH8S","name":"shaunc"},
//     "action_ts":"1520162909.626735",
//     "message_ts":"1520162906.000006",
//     "attachment_id":"1",
//     "token":"~",
//     "is_app_unfurl":false,
//     "response_url":"https:\/\/hooks.slack.com\/actions\/T446ZHZCM\/324381989189\/MC4cTfQapRT66BHKnUT3cL43",
//     "trigger_id":"325313099191.140237611429.394aac905741a80e785acc00af736e08"
//    }

// POST payloads from slack slash commands look like this:
//
//   payload = {
//     text: connect
//     token: ~
//     trigger_id: 324237861204.140237611429.2caca5a2609846b16eda4a46e415fefc
//     user_id: U444CRH8S
//     response_url: https://hooks.slack.com/commands/T446ZHZCM/325313596263/rvl0HvO2yXp7E4bqVgfPuIor
//     team_domain: marmolab
//     channel_name: zapier
//     user_name: shaunc
//     channel_id: C9H2SGDAB
//     team_id: T446ZHZCM
//     command: /goal
//   }

// 2018-03-04 - Shaun L. Cloherty <s.cloherty@ieee.org>

function doPost(e) {

//  e.parameter.payload = interactive message
//  e.parameter = slash command

  if (e.parameter.hasOwnProperty("payload")) {
    // this is an interactive message...
    return msgHandler(JSON.parse(e.parameter.payload));
  } else {
    // this is a slash command...
    return cmdHandler(e.parameter);
  }
}

function msgHandler(payload) {
  // handler for slack interactive messages
  if (payload.token != slackToken()) {
//    var err = { text: "",
//                attachments: [ mkErrorAttachment("Verification failed.") ] };
//
//    return ContentService.createTextOutput(JSON.stringify(err)).setMimeType(ContentService.MimeType.JSON);
    return mkErrorMsg("Verification failed.");
  }

  var msg = {
    response_type: "ephemeral",
    text: "Ok, got it!"
  };

  var options = {
    method: "post",
    contentType : "application/json",
    payload: JSON.stringify(msg)
  };

  // I don;t think this is the intended us of the response_url... we should be
  // responding with an empty HTTP 200, but Apps Script is synchronous so I'm fudging it
  var response = UrlFetchApp.fetch(payload.response_url,options);

  addUser(payload.user.id,payload.user.name);

//  msg = {
//    response_type: "ephemeral",
//    text: "",
//    attachment: {
//      fallback: "Connected!",
//      color: "good",
//      text: "Connected!",
//      mrkdn_in: [ "text" ]
//    }
//  };
//
//  options.payload = JSON.stringify(msg);
//
//  response = UrlFetchApp.fetch(payload.response_url,options);
//
//  eph = mkGeneralMsg("Ok, got it!");
//
//  return eph;
}

function cmdHandler(payload) {
  // handler for slack slash commands
  if (payload.token != slackToken()) {
//    var err = { text: "",
//                attachments: [ mkErrorAttachment("Verification failed.") ] };
//
//    return ContentService.createTextOutput(JSON.stringify(err)).setMimeType(ContentService.MimeType.JSON);
    return mkErrorMsg("Verification failed.");
  }

  var uid = payload.user_id;
  var uname = payload.user_name;
  var args = payload.text;

  switch (payload.command) {
    case "/goal":
      return goalHandler(uid,uname,args);
    case "/score":
      return scoreHandler(uid,uname,args);
  }

  // shouldn't be possible to end up here...
  return ContentService.createTextOutput("Got POST on "+ new Date() + " for " + payload.command + ".");
}

function goalHandler(uid,uname,args) {
  // handler for /goal commands

  // possible variants:
  //
  //   /goal <-- return current goal (user only, not displayed in channel)
  //   /goal @user <-- return current goal for @user (user only, not in channel)
  //   /goal new goal <-- set current goal to 'new goal' (shows in channel)
  //   /goal @user new goal <-- set current goal for @user (shows in channel)?
  //
  //   /goal help
  //   /goal connect
  //
  // so, args should be a string like: "<@U444CRH8S|shaunc> shaun's new goal"

  args = parseArgs(args); // uid, uname, body (either an action or a new goal)

  if (args.body) {
    // check for supported actions...
    var action = [/help/,/connect/]; // regexp for supported actions

    var idx = action.reduce(function(prev,re,i) {
      if (re.test(args.body)) {
        return i;
      }
      return prev;
    },null);

    switch(idx) {
      case 0: // help
        // return help msg
        return mkHelpMsg("/goal help message goes here");
      case 1: // connect
        // return connect prompt
        return mkConnectMsg(uid,uname);
    }
  }

  // check user is known to us...
  if (!getUser(uid)) {
    return mkUserErrorMsg();
  }

  // if we end up here, args.body is either empty or contains a new goal...

  if (args.body) {
    // setting goal

    if (args.uid && args.uid != uid) {
      return mkErrorMsg("You can't set goals for <@" + args.uid + ">.");
    }

    // set goal in Google sheet
//    setCurrentGoal(uid,uname,args.body); // adds the user if they don't exist
    return setCurrentGoal(uid,args.body);
  } else {
    // querying goal

    if (args.uid) {
      uid = args.uid;
    }

    // get goal from Google sheet
    return getCurrentGoal(uid);
  }
}

function testGoalHandler() {
  // test goalHandler()
  var uid = "Uxxxxxxxx";
  var uname = "nobody";

  // usage: /goal help
  args = "help";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result.getContent());

  // usage: /goal connect
  args = "connect";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result.getContent());

  // usage: /goal
  var args = "";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  var result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result.getContent());

  // usage; /goal @uname
  args = "<@" + uid + "|" + uname + "> ";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result.getContent());

  // usage: /goal lorem ipsum
  args = "lorem ipsum";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result.getContent());

  // usage: /goal @uname lorem ipsum
  args = "<@" + uid + "|" + uname + "> lorem ipsum";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result.getContent());

  // test unknonw user...
  uid = "Uyyyyyyyy";
  uname = "noname";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result.getContent());
}

function scoreHandler(uid,uname,args) {
  // handler for /score commands

  // possible variants:
  //
  //   /score <-- return current users score (user only, not in channel)
  //   /score @user <-- return the score for @user (user only, not in nchannel)
  //   /score @user score <-- set the score for @user (note: cannot set your own score) (shows in channel)
  //
  //   /score help
}

function parseArgs(args) {
  // parse slash command arguments

  // args is likely a string like: "<@U444CRH8S|shaunc> shaun's new goal"

  //defaults: undefined
  var uid = null;
  var uname = null;
  var body = null;

  var re = /.*(<@U.*>).*/; // regexp, match <@Uxxxxxxxx|xxxxxxxx>
  if (re.test(args)) {
    re = /.*<@(U\w+)\|(\w+)>\s*(.*)?/; // regexp
    var tokens = re.exec(args);

    uid = tokens[1];
    uname = tokens[2];

    if (typeof(tokens[3]) != "undefined") {
      body = tokens[3];
    }
  } else {
    re = /\s*(.*)?/; // regexp
    var tokens = re.exec(args);

    if (typeof(tokens[1]) != "undefined") {
      body = tokens[1];
    }
  }

  return ({uid: uid, uname: uname, body: body});
}

function getUser(uid) {
  // check that uid is known to us
  var ss = SpreadsheetApp.openById(sheetId());
  var s = ss.getSheetByName("Sheet1");

  var row = getRowByColumn(s,["Slack UID"],[uid])[0]; // first matching entry

  return (typeof(row) != "undefined"); // return true for know users
}

function testGetUser() {
  // test getUser()

  // known user
  uid = "Uxxxxxxxx";
  Logger.log("Testing getUser(%s)",uid);

  var result = getUser(uid);

  Logger.log("- %s.",result);

  // unknown user
  uid = "UUnknownUser";
  Logger.log("Testing getUser(%s)",uid);

  var result = getUser(uid);

  Logger.log("- %s.",result);
}

function addUser(uid,uname) { // OK
  // add a new user and return backend settings
  var ss = SpreadsheetApp.openById(sheetId());

  // 1. find candidate entry on the score sheet
  var s = ss.getSheetByName("Sheet1");

  var row = getRowByColumn(s,["Slack UID"],[uid])[0]; // first matching entry

  if (row != null) { // FIXME: row is actually 'undefined'
    // user exists...?
    return row;
  }

  // 2. user is unknown... but use some huristics here to see if we have any close matches
  Logger.log("User %s (%s) is unknown.",uid,uname);

  // loop over known writers and see if any "match" the supplied slack user name
  var col = getColumnByName(s,["Writer"]);

  var range = s.getDataRange();
  var nRows = range.getHeight();

  writerloop:
  for (row = 1; row <= nRows; row++) { // getHeight()
    var writer = range.getCell(row,col).getDisplayValue(); // col is the "Writer" column

    if (writer.length === 0) {
      // empty cell...
      continue
    }

    var re = new RegExp(".*"+writer+".*","i"); // case insensitive
    if (re.test(uname)) {
      // writer might be our new/unknown user...
      //
      // 1. check that this writers uid field is empty
      // 2. if so, appropriate the existing record by assigning the current uid to this writer,
      var uid_ = getRow(s,row,["Slack UID"])[0];

      Logger.log("User %s (%s) might be %s (uid:%s).",uid,uname,writer,uid_);

      if (uid_.length === 0) {
        Logger.log("Ok. Appropriating %s to be %s (%s).",writer,uid,uname);
        setRow(s,row,["Slack UID"],[uid]);
        break writerloop;
      }
    }
  }

  row = getRowByColumn(s,["Slack UID"],[uid])[0]; // first matching entry

  if (row == null) { // FIXME: row is 'undefined'
    // no entry found... create a new row
    s.insertRowAfter(nRows); // append row at the bottom (inherits formatting)

    row = nRows + 1;
    setRow(s,row,["Slack UID","Writer"],[uid,uname]);
  }

  // 3. find/create the users history sheet
  var h = ss.getSheetByName(uid);
  if (h == null) {
    // create the users history sheet...
//    var template = ss.getSheetByName('Template');
//    ss.insertSheet(uid, {template: template});
    ss.insertSheet(uid);
    h = ss.getSheetByName(uid);
    h.appendRow(["Date","Goal","Score"]); // column headings
  }

  // copy any existing goal to the history sheet
  h.insertRowAfter(h.getLastRow()); // append row at the bottom (inherits formatting)
  setRow(h,h.getLastRow()+1,["Date","Goal"],getRow(s,row,["Date","Goal"]));

  return row;
}

function testAddUser() {
  // test addUser()
  var ss = SpreadsheetApp.openById(sheetId());
  uid = "Uxxxxxxxx";
  uname = "nobody";

  Logger.log("Testing addUser(%s,%s,%s)",ss.getName(),uid,uname);

  var result = addUser(ss,uid,uname);

  Logger.log("- %s.",result);
}

function setCurrentGoal(uid,goal) {
  var ss = SpreadsheetApp.openById(sheetId());
  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?

  var s = ss.getSheetByName("Sheet1"); // FIXME

  var row = getRowByColumn(s,["Slack UID"],[uid])[0];

  if (row == null) {
//    var row = addUser(ss,uid,uname);
    return mkUserErrorMsg(); // shouldn't ever end up here!
  }

  setRow(s,row,["Date","Goal"],[new Date(),goal]);

  // update the history sheet
  var h = ss.getSheetByName(uid);
  h.insertRowAfter(h.getLastRow()); // append row at the bottom (inherits formatting)
  setRow(h,h.getLastRow()+1,["Date","Goal"],[new Date(),goal]);

//  return ContentService.createTextOutput("Ok, got it!"); // FIXME: echo the goal to the channel instead?
  return mkGeneralMsg("Ok, got it!",true); // true = display in channel
}

function testSetCurrentGoal() {
  // test setCurrentGoal()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");

  var row = getRowByColumn(s,["Writer"],["nobody"]);
  var uid = getRow(s,row,["Slack UID"]);

  var goal = "lorem ipsum";

  // known user
  Logger.log("Testing setCurrentGoal(%s,%s)",uid,goal);

  var result = setCurrentGoal(uid,goal);

  Logger.log("- %s",result.getContent());

  // unknown user
  uid = "UUnknownUser";
  Logger.log("Testing setCurrentGoal(%s,%s)",uid,goal);

  var result = setCurrentGoal(uid,goal);

  Logger.log("- %s",result.getContent());
}

function getCurrentGoal(uid) {
  var ss = SpreadsheetApp.openById(sheetId());
  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?

  var s = ss.getSheetByName("Sheet1"); // FIXME

  var row = getRowByColumn(s,["Slack UID"],[uid])[0];

  if (row == null) {
    return mkGeneralMsg("I don't know <@" + uid + ">."); // FIXME: uid isn't know to us...
  }

  var goal = getRow(s,row,["Goal"])[0];

  return mkGeneralMsg(goal);
}

function testGetCurrentGoal() {
  // test getCurrentGoal()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");

  var row = getRowByColumn(s,["Writer"],["Shaun"]);
  var uid = getRow(s,row,["Slack UID"]);

  // known user
  Logger.log("Testing getCurrentGoal(%s)",uid);

  var result = getCurrentGoal(uid);

  Logger.log("- %s",result.getContent());

  // unknown user
  uid = "UUnknownUser";
  Logger.log("Testing getCurrentGoal(%s)",uid);

  var result = getCurrentGoal(uid);

  Logger.log("- %s",result.getContent());
}

function getColumnByName(s,name) { // OK
  // find column(s) by name, returning column number(s)
  var range = s.getDataRange();

  var nRows = range.getHeight();
  var nCols = range.getWidth();

  // first nonempty row contains column headings...
  rowloop:
  for (var row = 1; row <= nRows; row++) {
    for (var col = 1; col <= nCols; col++) {
      var value = range.getCell(row,col).getDisplayValue();
      if (value) {
        // first non-empty cell
        var headings = s.getRange(row,col,1,nCols-col+1).getValues()[0];

        name = name.map(function(n) {
          if (typeof(n) == "RegExp") {
            return n;
          } else {
            return new RegExp(n,"i");
          }
        });

        // look for our column heading... colName
        var idx = name.map(function(re) {
          for (var i = 0; i < headings.length; i++) {
            if (re.test(headings[i])) {
              return i + col;
            }
          }
        });

        break rowloop;
      }
    } // col
  } // row

  return idx
}

function testGetColumnByName() {
  // test getColumnByName()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  name = ["Writer"];

  Logger.log("Testing getColumnByName(%s,%s)",s.getName(),name);

  var result = getColumnByName(s,name);

  Logger.log("- %s",result);
}

function getRowByColumn(s,name,value) { // OK
  // find row by contents of column name, returning row number
  var range = s.getDataRange();

  var nRows = range.getHeight();
  var nCols = range.getWidth();

  var col = getColumnByName(s,name)[0]; // column index

  if (col == null) {
    return null; // column not found?
  }

  var idx = new Array();
  for (var row = 1; row <= nRows; row++) {
    var val = range.getCell(row,col).getValue();

    value.forEach(function(v) {
      if (v == val) {
        idx.push(row);
      }
    });

  }

  return idx;
}

function testGetRowByColumn() {
  // test getRowByColumn()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  name = ["Writer"];
  value = ["Shaun"];

  Logger.log("Testing getRowByColumn(%s,%s,%s)",s.getName(),name,value);

  var result = getRowByColumn(s,name,value);

  Logger.log("- %s",result);
}


function setRow(s,row,name,value) { // SET name = value WHERE row; OK
  // set column name(s) to value(s) on row

//  var range = s.getDataRange();
  var range = s.getRange(1,1,row,s.getLastColumn()); // in case row is empty and therefore not included by getDataRange()

  var nRows = range.getHeight();

  var col = getColumnByName(s,name); // column indicies

  for (var i = 0; i < col.length; i++) {
    var cell = range.getCell(row,col[i]);
    cell.setValue(value[i]);
  }
}

function testSetRow() {
  // test setRow()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  row = getRowByColumn(s,["Writer"],["Shaun"]);
  name = ["Goal"];
  value = ["A new goal for Shaun."];

  Logger.log("Testing setRow(%s,%s,%s,%s)",s.getName(),row,name,value);

  var result = setRow(s,row,name,value);

  Logger.log("- %s",result);
}

function getRow(s,row,name) { // SELECT name WHERE row; OK
  // get value(s) from column name(s) on row

  var range = s.getDataRange();

  var value = getColumnByName(s,name).map(function (col) {
    return range.getCell(row,col).getValue();
  });

  return value;
}

function testGetRow() {
  // test getRow()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  row = getRowByColumn(s,["Writer"],["Shaun"]);
  name = ["Writer","Goal"];

  Logger.log("Testing getRow(%s,%s,%s)",s.getName(),row,name);

  var result = getRow(s,row,name);

  Logger.log("- %s",result);
}

//
// response formatting
//

function mkHelpMsg() {
  // build the help action response

  var attachment = {
    color: "good",
    text: "Use `/goal` to manage your writing goal. For example:",
    fields: [
      {
        value: "* `/goal` Do more stuff.\n* `/goal`\n* `/goal @user`\n",
        short: true
      },
      {
        value: "will set a new goal.\nwill return your current goal.\nwill return @user's goal.\n",
        short: true
      },
      {
        value: "For more, msg <@" + feedbackUid() + ">.",
        short: false
      }
    ],
    mrkdwn_in: ["text","fields"]
  };

  var response = {
    response_type: "ephemeral",
    text: "",
    attachments: [ attachment ]
  };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function mkHelpAttachment(msg) {
  return ({
    color: "good",
    text: msg,
    mrkdwn_in: ["text"]
  })
}

function mkConnectMsg(uid,uname) {
  // build the connect action response

  var attachment = {
    fallback: "Click to connect.",
    color: "good",
    text: "Click the button below to connect with the GoalKeeper...",
    callback_id: "connect_button",
    actions: [ {
        type: "button",
        text: "Connect",
        name: "connect",
        value: "connect",
    } ],
    mrkdn_in: [ "text" ]
  };

  var response = {
    response_type: "ephemeral",
    text: "You have goals? Awesome!",
    attachments: [ attachment ]
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function mkUserErrorMsg() {
  return mkErrorMsg("I don't know you... try `/goal connect` so we can get aquainted.");
}

function mkErrorMsg(msg) {
  var response = {
    response_type: "ephemeral",
    text: "",
    attachments: [ mkErrorAttachment(msg) ]
  };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function mkErrorAttachment(msg) {
  return ({
    color: "danger",
    text: "*Error*:\n" + msg,
    mrkdwn_in: ["text"]
  })
}

function mkGeneralMsg(msg,inChannel) {
  var response_type = "ephemeral"
  if (inChannel) {
    response_type = "in_channel";
  }

  var response = {
    response_type: response_type,
    text: msg
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
