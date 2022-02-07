const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const dataElement = document.getElementById('dataOverlay');
const canvasCtx = canvasElement.getContext('2d');
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 500;
const states = {
    IDLE: 'idle',
    RECORDING: 'recording'
}
let currentState = states.IDLE;
let initTimer = new Date();
let sampleData = "";
let predictionStack = [];
let recordDataStack = [];
let intervalID = null;
const months = ["JAN", "FEB", "MAR","APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
let buidInProcess = false;

let drawHands = true;

/////////////// Back-end communication /////////////
var worker = new Worker('../../js/worker.js');
function toggleRecording() {
  if ($("#recordButton") != null) {
    if ($("#recordButton").hasClass("recordButton-inactive")) {
      $("#recordButton").removeClass("recordButton-inactive");
      $("#recordButton").addClass("recordButton-active");
      $("#recordButton").text("Stop");

      startLog();
      currentState = states.RECORDING;
      
      console.log("Starting Recording!");
    } else if ($("#recordButton").hasClass("recordButton-active")){
      $("#recordButton").removeClass("recordButton-active");
      $("#recordButton").addClass("recordButton-inactive");
      $("#recordButton").text("Record");

      buildLog("Gesture Name");
      currentState = states.IDLE;
      console.log("Stopped Recording!");
    }
  }
}

window.toggleRecording = toggleRecording;


// Format recording data into Json type. 
function buildLog(actionName) {
  if (!buidInProcess) {
      buidInProcess = true;
      let data = {
          operation: actionName,
          datetime: getFormattedDateTime(new Date()),
          handdata: {
              RHand: [],
              LHand: []
          }
      };
      for (let i = 0; i < predictionStack.length; i++) {
          if (predictionStack[i][1].length == 2 && predictionStack[i][2].length == 2) {
              // swaped hand indexes due to mirrored canvas projection.
              const lindex = (predictionStack[i][1][0].label == "Left") ? 1 : 0;
              const rindex = (predictionStack[i][1][0].label == "Right") ? 1 : 0;
              data.handdata.LHand.push({
                  time: predictionStack[i][0],
                  keypoints: predictionStack[i][2][lindex]
              });
              data.handdata.RHand.push({
                  time: predictionStack[i][0],
                  keypoints: predictionStack[i][2][rindex]
              });
          } else if (predictionStack[i][1].length == 1 && predictionStack[i][2].length == 1) {
              if (predictionStack[i][1][0].label == "Left") {
                  // swaped hand data due to mirrored canvas projection.
                  data.handdata.RHand.push({
                      time: predictionStack[i][0],
                      keypoints: predictionStack[i][2][0]
                  });
                  data.handdata.LHand.push({
                      time: predictionStack[i][0],
                      keypoints: [NaN]
                  });
              } else if (predictionStack[i][1][0].label == "Right") {
                  // swaped hand data due to mirrored canvas projection.
                  data.handdata.RHand.push({
                      time: predictionStack[i][0],
                      keypoints: [NaN]
                  });
                  data.handdata.LHand.push({
                  time: predictionStack[i][0],
                  keypoints: predictionStack[i][2][0]
              });
              }
          }
      }
      stopLog(data);
      predictionStack = [];
      buidInProcess = false;
  }
}

// Start recording gesture cordinates.
function startLog() {
  // Init time elapsed counter and data logging.
  initTimer = new Date();
}

// Stop recording gesture cordinates.
function stopLog(parsedData) {

  // if (parsedData.handdata.LHand.length <= 0 && parsedData.handdata.RHand.length <= 0) {
  //     $('#responseStatus').css('display', 'inline-block');
  //     $('#responseStatus').css('color', 'salmon');
  //     $('#responseStatus').text('There are no data in recorded clip to save!');
  //     $('#responseStatus').fadeOut(6600);
  //     return;
  // }

  // If client-side parse enabled, run background thread to parse json data to csv.
  // To increase performance of the app.
  // Send data to server.

  var cachedUserId;
  if (localStorage.getItem('userId') != null) {
    cachedUserId = localStorage.getItem('userId');
  } else {
    cachedUserId = localStorage.getItem('userIdAnon');
  }

  if (parsedData.handdata.LHand.length <= 0 && parsedData.handdata.RHand.length <= 0) {
    console.log('There are no data in recorded clip to save!');
    return;
  }

  const dirrectoryName = "gestureName/" + cachedUserId;

  $.post("/results/hands/", {dirName: dirrectoryName, data: parsedData}, function (data, status, jqXHR) {
      if (status == 'success') {
        console.log(parsedData);
        console.log("Data sent to server successfully!");
      } else {
        console.log("Data sent to server failed.");
      }
  });
}

// Save data on client side.
worker.onmessage = function (e) {
  e.data.forEach(csvData => {
      download(csvData[0], csvData[1]);
  });
}

// Auto download data on client-side after recording.
function download(filename, data) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(data));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// To get current datetime string format.
function getFormattedDateTime(dt = Date){
  return dt.getDate() + "-" + 
      months[dt.getMonth()] + "-" + 
      dt.getFullYear() + " " + 
      dt.getHours() + "-" + 
      dt.getMinutes() + "-" + 
      dt.getSeconds();
}
//////////////////////////////////////////

function toggleDrawHands(checkbox) {
  if(checkbox.checked){
    drawHands = true;
    console.log("Enabled hands skeleton");
  } else {
    drawHands = false;
    console.log("Disabled hands skeleton");
  }
}

function toggleDrawData(checkbox) {
  if(checkbox.checked){
    dataElement.style.display = "block";
    console.log("Enabled reference animation");
  } else {
    dataElement.style.display = "none";
    console.log("Disabled reference animation");
  }
}
window.toggleDrawHands = toggleDrawHands;
window.toggleDrawData = toggleDrawData;

// Callback of API, called when hand is detected.
function onResults(results) {
    // console.log(results);
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks) {
        // Saving recording results
        if (currentState == states.RECORDING) {
            const elapsedTime = (new Date() - initTimer);
            predictionStack.push([elapsedTime, results.multiHandedness, results.multiHandLandmarks]);
        }
        // drawing points on hand
        if (drawHands) {
          for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
                            {color: '#FFFF00', lineWidth: 3});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});
          }
        }        
    }
    canvasCtx.restore();
}

const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({image: videoElement});
  },
  width: VIDEO_WIDTH,
  height: VIDEO_HEIGHT
});
camera.start();
