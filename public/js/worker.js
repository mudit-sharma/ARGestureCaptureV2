onmessage = function (e) {
    let fileData = generateFileData(e.data[1], (e.data[0]));
    postMessage(fileData);
}

function JSONToCSVString(jsonData, isMediaPipeData) {
    sampleData = "";
    sampleData += "TIME";
    for (let i = 0; i < 21; i ++) {
        sampleData += `,JOINT_${i}_X, JOINT_${i}_Y, JOINT_${i}_Z`;
    }
    sampleData += "\n";
    for (let i = 0; i < jsonData.length; i++) {
        sampleData += `${jsonData[i].time}`;
        // console.log(`i: ${i}`);
        for (let j = 0; j < jsonData[i].keypoints.length; j++) {
            if (jsonData[i].keypoints.length == 21)
                if (isMediaPipeData)
                    sampleData += `,${jsonData[i].keypoints[j].x}, ${jsonData[i].keypoints[j].y}, ${'z' in jsonData[i].keypoints[j] ? jsonData[i].keypoints[j].z : '0'}`;
                else if (jsonData[i].keypoints[j].length == 3)
                    sampleData += `,${jsonData[i].keypoints[j][0]}, ${jsonData[i].keypoints[j][1]}, ${jsonData[i].keypoints[j][2]}`;
        }
        sampleData += "\n";
    }
    return sampleData;
}

function generateFileData(responseData, apiName) {
    const operation = responseData.opIndex.toString().trim() + "_" + responseData.operation.toString().trim();
    const datetime = responseData.datetime.toString().trim();
    
    let fileData = [];
    for (const [key, value] of Object.entries(responseData.handdata)) {
        const fileName = `${operation}#${key}#${datetime}.csv`;
        const csvData = JSONToCSVString(value, apiName.toLowerCase().includes("mediapipe"));
        fileData.push([fileName, csvData]);
    }
    return fileData;
}