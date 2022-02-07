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

/// 
function toggleRecording() {
  if ($("#recordButton") != null) {
    if ($("#recordButton").hasClass("recordButton-inactive")) {
      $("#recordButton").removeClass("recordButton-inactive");
      $("#recordButton").addClass("recordButton-active");
      $("#recordButton").text("Stop");

      currentState = states.RECORDING;
      console.log("Starting Recording!");
    } else if ($("#recordButton").hasClass("recordButton-active")){
      $("#recordButton").removeClass("recordButton-active");
      $("#recordButton").addClass("recordButton-inactive");
      $("#recordButton").text("Record");

      currentState = states.IDLE;
      console.log("Stopped Recording!");
    }
  }
}

window.toggleRecording = toggleRecording;

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