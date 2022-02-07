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

let drawSkeleton = true;

function toggleDrawHands(checkbox) {
  if(checkbox.checked){
    drawSkeleton = true;
    console.log("Enabled body skeleton");
  } else {
    drawSkeleton = false;
    console.log("Disabled body skeleton");
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
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  // canvasCtx.drawImage(results.segmentationMask, 0, 0,
  //                     canvasElement.width, canvasElement.height);

  // // Only overwrite existing pixels.
  // canvasCtx.globalCompositeOperation = 'source-in';
  // canvasCtx.fillStyle = '#00FF00';
  // canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // // Only overwrite missing pixels.
  // canvasCtx.globalCompositeOperation = 'destination-atop';
  canvasCtx.drawImage(
      results.image, 0, 0, canvasElement.width, canvasElement.height);
  
  // canvasCtx.globalCompositeOperation = 'source-over';

  if (drawSkeleton) {
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
      {color: '#00FF00', lineWidth: 4});
    drawLandmarks(canvasCtx, results.poseLandmarks,
        {color: '#FF0000', lineWidth: 2});
    // drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION,
    //       {color: '#C0C0C070', lineWidth: 1});
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS,
          {color: '#CC0000', lineWidth: 5});
    drawLandmarks(canvasCtx, results.leftHandLandmarks,
        {color: '#00FF00', lineWidth: 2});
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS,
          {color: '#00CC00', lineWidth: 5});
    drawLandmarks(canvasCtx, results.rightHandLandmarks,
        {color: '#FF0000', lineWidth: 2});
  }
  
  canvasCtx.restore();
}

const holistic = new Holistic({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}});
holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
holistic.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({image: videoElement});
  },
  width: VIDEO_WIDTH,
  height: VIDEO_HEIGHT
});
camera.start();