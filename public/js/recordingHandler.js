let dataElement;
let recordedCount;
let recordedCounterSpan;

window.onload = function () {
    dataElement = $("#dataOverlay");
    recordedCount = localStorage.getItem("recorded-"+ dataElement.attr('class'));
    recordedCounterSpan = document.getElementById("recorded-"+dataElement.attr('class'));

    if (recordedCount === null) {
        localStorage.setItem("recorded-"+dataElement.attr('class'),0);
        recordedCount = localStorage.getItem("recorded-"+dataElement.attr('class'));
        recordedCounterSpan.textContent = recordedCount;
    } else {
        recordedCounterSpan.textContent = recordedCount;
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
    return recordedCount;
}