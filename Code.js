// bare bones slash command handler for slack...

// POST payloads from slack slash commands contain the following parameters:
//
//   user_name: shaunc
//   trigger_id: 323566020866.140237611429.d0b91a86770f6d14f4f35304f6be858c
//   user_id: U444CRH8S
//   team_id: T446ZHZCM
//   response_url: https://hooks.slack.com/commands/T446ZHZCM/324617447287/H6jQI1o93lOIrQBBnvVdvAj5
//   channel_name: zapier
//   token: SLACK VERIFICATION TOKEN
//   team_domain: marmolab
//   command: /goal
//   channel_id: C9H2SGDAB
//   text: my new goal

// 2018-03-02 - Shaun L. Cloherty <s.cloherty@ieee.org>

function doPost(payload) {

  if (payload.parameter.token != slackToken()) {
    var err = { text: "",
                attachments: [ mkErrorAttachment("Verification failed.") ] };

    return ContentService.createTextOutput(JSON.stringify(err)).setMimeType(ContentService.MimeType.JSON);
  }

  var uid = payload.parameter.user_id;
  var uname = payload.parameter.user_name;
  var args = payload.parameter.text;

  switch (payload.parameter.command) {
    case "/goal":
      return goalHandler(uid,uname,args);
    case "/score":
      return scoreHandler(uid,uname,args);
  }

  // shouldn't be possible to end up here...
  return ContentService.createTextOutput("Got POST on "+ new Date() + " for " + payload.parameter.command + ".");
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
  // so, args should be a string like: "<@U444CRH8S|shaunc> shaun's new goal"

//  // DEBUG ONLY
//  uid = "U444CRH8S";
//  uname = "shaunc"
//  args = "";
//  //

  args = parseArgs(args); // uid, uname, body/goal
  if (args.uid) {
    uid = args.uid;
  }
  if (args.uname) {
    uname = args.uname;
  }

  Logger.log("goalHandler(): uid: " + uid + ", uname: " + uname);

  // check for user?
  
  var result = "uid: " + uid + ", uname: " + uname;
  if (args.body) {
    // setting goal

    // set goal in Google sheet
    setCurrentGoal(uid,uname,args.body); // adds the user if they don't exist

    result = result + ", goal: " + args.body;
  } else {
    // querying goal

    // get goal from Google sheet
    result = result + ", goal: " + getCurrentGoal(uid);
  }

  return ContentService.createTextOutput(result);
}

function scoreHandler(uid,uname,args) {
  // handler for /score commands

  // possible variants:
  //
  //   /score <-- return current users score (user only, not in channel)
  //   /score @user <-- return the score for @user (user only, not in nchannel)
  //   /score @user score <-- set the score for @user (note: cannot set your own score) (shows in channel)
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

//function getUser(uid,uname) {
//  // get backend settings for the user
//
//  var ss = SpreadsheetApp.openById(sheetId());
//  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?
//
//  //  var ss = SpreadsheetApp.getActiveSpreadsheet();
//
//  // look for the users sheet...
//  hs = ss.getSheetByName(uid);
//  if (hs == null) {
//    hs = addUser(ss,uid,uname);
//  }
//
//  // get users row on the score card
//
//
//
//  Logger.log(uname + " --> " + hs.getName() + "(" + hs.getIndex() + ")");
//
//
//}

function addUser(ss,uid,uname) { // OK
  // add a new user and return backend settings
  
//  // DEBUG ONLY
//  ss = SpreadsheetApp.openById(sheetId());
////  uid = "Uxxxxxxxx";
////  uname = "nobody";
//  uid = "U444CRH8S";
//  uname = "shaunc";
//  //
  
  // 1. find candidate entry on the score sheet
  var s = ss.getSheetByName("Sheet1");
  
  var row = getRowByColumn(s,["Slack UID"],[uid])[0]; // first matching entry
    
  if (row != null) { // FIXME: row is actually 'undefined'
    // user exists...?
    return row;
  }
  
  // 2. user is unknown... but use some huristics here to see if we have any close matches
  Logger.log("User " + uid + " (" + uname + ") unknown.");
  
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
      
      Logger.log("User " + uid + " (" + uname + ") might be " + writer + " (uid:" + uid_ + ").");
      
      
      if (uid_.length === 0) {
        Logger.log("Ok. Appropriating " + writer + " to be " + uid + " (" + uname + ").");
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

function getCurrentGoal(uid) {  
  var ss = SpreadsheetApp.openById(sheetId());
  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?

//  var ss = SpreadsheetApp.getActiveSpreadsheet();

//  // DEBUG ONLY
//  uid = "U444CRH8S";
//  //
  
  var s = ss.getSheetByName("Sheet1"); // FIXME
//  var range = s.getDataRange();
//
//  var nRows = range.getHeight();
//  var nCols = range.getWidth();
//
//  var pat = [/writer.*/i,/goal.*/i]; // regexp for column headings
//
//  // first nonempty row contains column headings...
//  rowloop:
//  for (var row = 1; row <= nRows; row++) { // getHeight()
//    for (var col = 1; col <= nCols; col++) { // getWidth()
//      var value = range.getCell(row,col).getDisplayValue();
//      if (value) {
//        // (row,col) is the first non-empty cell
//        var headings = s.getRange(row,col,1,nCols).getValues()[0];
//
//        // look for our column headings... pat
//        var colIdx = pat.map(function(re) {
//          for (var i = 0; i < headings.length; i++) {
//            if (re.test(headings[i])) {
//              return i + 1; // rows start at 1
//            }
//          }
//        });
//
//        // update range
//        range = s.getRange(row+1,col,nRows-row,nCols-col+1); // note: excludes headings...
//
////        Logger.log(colIdx);
//        break rowloop;
//      }
//    }
//  }
//
//  nRows = range.getHeight();
//  nCols = range.getWidth();
//
//  // get list of writers
//  writerloop:
//  for (var row = 1; row <= nRows; row++) { // getHeight()
//    var writer = range.getCell(row,colIdx[0]).getDisplayValue(); // colIdx[0] is the writer column
//
////    Logger.log(writer);
//
//    var re = new RegExp(".*"+writer+".*","i");
//    if (re.test(uname)) {
//      var goal = range.getCell(row,colIdx[1]).getDisplayValue(); // colIdx[1] is the goal column
//
//      Logger.log(uname + " --> " + goal);
//    }
//  }

  var row = getRowByColumn(s,["Slack UID"],[uid]);
  
  if (row[0] != null) {
    return getRow(s,row[0],["Goal"])[0];
  }
}

function getColumnByName(s,name) { // OK
  // find column(s) by name, returning column number(s)

//  // DEBUG ONLY
//  var ss = SpreadsheetApp.openById(sheetId());
//  s = ss.getSheetByName("Sheet1");
//  name = ["Writer"];
//  //

  var range = s.getDataRange();

  var nRows = range.getHeight();
  var nCols = range.getWidth();

//  var pat = [/writer.*/i,/goal.*/i]; // regexp for column headings

  // first nonempty row contains column headings...
  rowloop:
  for (var row = 1; row <= nRows; row++) {
    for (var col = 1; col <= nCols; col++) {
      var value = range.getCell(row,col).getDisplayValue();
      if (value) {
        // first non-empty cell
        var headings = s.getRange(row,col,1,nCols-col+1).getValues()[0];

//        if (typeof(name) != "Array") {
//          name = [name]; // for easy looping
//        }

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

//  if (idx.length == 1) {
//    idx = idx[0];
//    
//    if (typeof(idx) == "undefined") {
//      idx = null; // column not found
//    }
//  }
  
  return idx
}

function getRowByColumn(s,name,value) { // OK
  // find row by contents of column name, returning row number

//  // DEBUG ONLY
//  var ss = SpreadsheetApp.openById(sheetId());
//  s = ss.getSheetByName("Sheet1");
//  name = ["Writer"];
//  value = ["Shaun"];
//  //
  
  var range = s.getDataRange();

  var nRows = range.getHeight();
  var nCols = range.getWidth();

  var col = getColumnByName(s,name)[0]; // column index

  if (col == null) {
    return null; // column not found?
  }

//  if (typeof(value) != "Array") {
//    value = [value]; // for easy looping
//  }

  var idx = new Array();
  for (var row = 1; row <= nRows; row++) {
    var val = range.getCell(row,col).getValue();

    value.forEach(function(v) {
      if (v == val) {
        idx.push(row);
      }
    });
    
  }
  
//  if (idx.length == 1) {
//    idx = idx[0];
//    
//    if (typeof(idx) == "undefined") {
//      idx = null;
//    }   
//  }
  
  return idx;
}

function setRow(s,row,name,value) { // SET name = value WHERE row; OK
  // set column name(s) to value(s) on row
  
//  // DEBUG ONLY
//  var ss = SpreadsheetApp.openById(sheetId());
//  s = ss.getSheetByName("Sheet1");
//  row = getRowByColumn(s,["Writer"],["Shaun"]);
//  name = ["Goal"];
//  value = ["A newish goal for Shaun."];
//  //
  
//  var range = s.getDataRange();
  var range = s.getRange(1,1,row,s.getLastColumn()); // in case row is empty and therefore not included by getDataRange()
  
  var nRows = range.getHeight();
    
  var col = getColumnByName(s,name); // column indicies
  
  for (var i = 0; i < col.length; i++) {
    var cell = range.getCell(row,col[i]);
    cell.setValue(value[i]);
  }  
}

function getRow(s,row,name) { // SELECT name WHERE row; OK
  // get value(s) from column name(s) on row
  
//  //  // DEBUG ONLY
//  var ss = SpreadsheetApp.openById(sheetId());
//  s = ss.getSheetByName("Sheet1");
//  row = getRowByColumn(s,["Writer"],["Shaun"]);
//  name = ["Writer","Goal"];
//  //
  
  var range = s.getDataRange();
  
  var value = getColumnByName(s,name).map(function (col) {
    return range.getCell(row,col).getValue();
  });
  
//  Logger.log(value);
  
  return value;
}

function setCurrentGoal(uid,uname,goal) {
  var ss = SpreadsheetApp.openById(sheetId());
  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?

  var s = ss.getSheetByName("Sheet1"); // FIXME
  
  var row = getRowByColumn(s,["Slack UID"],[uid])[0];
  
  if (row == null) {
    var row = addUser(ss,uid,uname);
  }
  
  setRow(s,row,["Goal"],[goal]);
  
  // update the history sheet
  var h = ss.getSheetByName(uid);
  h.insertRowAfter(h.getLastRow()); // append row at the bottom (inherits formatting)
  setRow(h,h.getLastRow()+1,["Date","Goal"],[new Date(),goal]);
}

function mkErrorAttachment(msg) {
  return ({
    color: "danger",
    text: "*Error*:\n" + msg,
    mrkdwn_in: ["text"]
  })
}
