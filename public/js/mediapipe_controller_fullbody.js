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
let bodyJoints = [];
let intervalID = null;
const months = ["JAN", "FEB", "MAR","APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const recordingStartDelay = 5;
let buidInProcess = false;

let drawSkeleton = true;

var worker = new Worker('../../js/worker.js');

async function toggleRecording() {
  let recordButton = $("#recordButton");
  if (recordButton != null) {
    if (recordButton.hasClass("recordButton-inactive")) {

      // Start timer here:
      recordButton.css("display",'none');
      await startTimer(recordingStartDelay);

      recordButton.css("display",'');
      recordButton.removeClass("recordButton-inactive");
      recordButton.addClass("recordButton-active");
      recordButton.text("Stop");
      
      // When timer finishes:
      startLog();
      currentState = states.RECORDING;
      
      console.log("Starting Recording!");
    } else if (recordButton.hasClass("recordButton-active")){
      recordButton.removeClass("recordButton-active");
      recordButton.addClass("recordButton-inactive");
      recordButton.text("Record");

      buildLog($("#dataOverlay").attr('class'));
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
          recordingnumber: getRecordingCount(),
          bodydata: {
              RHand: [],
              LHand: [],
              Body: []
          },
      };
      //console.dir(predictionStack);
      for (let i = 0; i < predictionStack.length; i++) {
        data.bodydata.LHand.push({
          time: predictionStack[i][0],
          keypoints: predictionStack[i][1]
        });
        data.bodydata.RHand.push({
          time: predictionStack[i][0],
          keypoints: predictionStack[i][2]
        });
        data.bodydata.Body.push({
          time: predictionStack[i][0],
          keypoints: predictionStack[i][3]
        });
        
        bodyJoints.push({time: predictionStack[i][0], Lkeypoints: predictionStack[i][1], Rkeypoints: predictionStack[i][2], Bodykeypoints: predictionStack[i][3]})
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
async function stopLog(parsedData) {

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

  if (parsedData.bodydata.LHand.length <= 0 && parsedData.bodydata.RHand.length <= 0 && parsedData.bodydata.Body.length <= 0) {
    console.log('There are no data in recorded clip to save!');
    emptyRecording();
    return;
  }

  const directoryName = `${parsedData.operation}/` + cachedUserId;
  $("#recordButton").text("Saving...");
  try {
    await sendFullbodyGestureToServer(directoryName,parsedData);
  } catch {
    $("#recordButton").text("Record");
  }
}

async function sendFullbodyGestureToServer(directoryPath,parsedData) {
  $.post("/results/fullbody/", {dirName: directoryPath, data: parsedData}, function (data, status, jqXHR) {
    if (status == 'success') {
      //console.log(parsedData);
      console.log("Data sent to server successfully!");
      finishRecording(false,bodyJoints);
      bodyJoints = [];
      $("#recordButton").text("Record");
      // addNewRecording();
      // createBodyJointsGeometry(bodyJoints);
    } else {
      console.log("Data sent to server failed.");
      failedRecording();
      $("#recordButton").text("Record");
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

function toggleDrawSkeleton(checkbox) {
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
window.toggleDrawSkeleton = toggleDrawSkeleton;
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
  //console.dir(results);
  if (currentState == states.RECORDING) {
    const elapsedTime = (new Date() - initTimer);
    predictionStack.push([elapsedTime, results.leftHandLandmarks, results.rightHandLandmarks, results.poseLandmarks]);
  }

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
  enableSegmentation: false,
  smoothSegmentation: false,
  refineFaceLandmarks: false,
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