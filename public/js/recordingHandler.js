let dataElement;
let recordedCount;
let recordedCounterSpan;
let statusElement;
let timerElement;
let retryButton;
let acceptButton;
let recordButton;
let replayOverlayElement;
let nextButton;

const mininumRecordings = 3;

document.addEventListener("DOMContentLoaded", function () {
    dataElement = $("#dataOverlay");
    statusElement = $("#recordingStatus");
    timerElement = $("#recordingTimer");
    retryButton = $("#retryButton");
    acceptButton = $("#acceptButton");
    recordButton = $("#recordButton");
    replayOverlayElement = $("#replayOverlay");
    nextButton = $("#nextButton");

    recordedCount = localStorage.getItem("recorded-"+ dataElement.attr('class'));
    recordedCounterSpan = document.getElementById("recorded-"+dataElement.attr('class'));

    if (recordedCount === null) {
        localStorage.setItem("recorded-"+dataElement.attr('class'),0);
        recordedCount = localStorage.getItem("recorded-"+dataElement.attr('class'));
        recordedCounterSpan.textContent = recordedCount;
    } else {
        recordedCounterSpan.textContent = recordedCount;
    }

    checkRecordingCount();
});

function sleep(ms=1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startTimer(time) {
    let remaining = time;
    statusElement.text("Recording starting in:");
    timerElement.text(remaining);
    timerElement.css("display",'');

    while (remaining >= 0) {
        timerElement.text(remaining);
        console.log(`Countdown until recording starts: ${remaining}`);
        await sleep(1000);
        remaining = remaining - 1;
    }

    $("#dataOverlay").css("display","none");

    statusElement.text("Recording started! Press Stop to stop the recording process.");
    timerElement.css("display",'none');
}

function finishRecording(hands=true,joints) {
    statusElement.text("Recording finished! You can choose to RETRY or SAVE this recording.");
    replayOverlayElement.css("display",'');
    if (hands) {
        createHandJointsGeometry(joints);
    } else {
        createBodyJointsGeometry(joints);
    }

    recordButton.css("display","none");
    acceptButton.css("display",'');
    retryButton.css("display",'');
    $("#dataOverlay").css("display",'');
}

function retryRecording() {
    statusElement.text("Recording discarded! Press Record button to start a new recording.");
    recordButton.css("display",'');
    acceptButton.css("display","none");
    retryButton.css("display","none");
    replayOverlayElement.css("display","none");

    stopReplayAnimation();
    checkRecordingCount();
}

function acceptRecording() {
    statusElement.text("Recording saved! Press Record button to start a new recording.");
    recordButton.css("display",'');
    acceptButton.css("display","none");
    retryButton.css("display","none");
    replayOverlayElement.css("display","none");

    stopReplayAnimation();
    addNewRecording();
    checkRecordingCount();
}

function failedRecording() {
    statusElement.text("No data to record, please try again!");
    recordButton.css("display",'');
    acceptButton.css("display","none");
    retryButton.css("display","none");
    replayOverlayElement.css("display","none");
    checkRecordingCount();
}

function emptyRecording() {
    statusElement.text("No data to record, please try again!");
    recordButton.css("display",'');
    acceptButton.css("display","none");
    retryButton.css("display","none");
    replayOverlayElement.css("display","none");
    checkRecordingCount();
}

function checkRecordingCount() {
    if (recordedCount >= mininumRecordings) {
        nextButton.css("display",'');
    }
}

function addNewRecording() {
    recordedCount++;
    localStorage.setItem("recorded-"+dataElement.attr('class'), recordedCount);
    recordedCounterSpan.textContent = recordedCount;
}

function removeAllRecordings() {
    recordedCount = 0;
    localStorage.setItem("recorded-"+dataElement.attr('class'), recordedCount);
    recordedCounterSpan.textContent = recordedCount;
}

function getRecordingCount() {
    return (recordedCount) ? recordedCount : 0;
}