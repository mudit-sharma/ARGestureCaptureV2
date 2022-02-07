
window.onload = function () {
    let cachedUserId = localStorage.getItem('userId');
    let userIdForm = document.getElementById("userIdForm");
    
    if (userIdForm != null) {
        let inputs = userIdForm.children;
        for (let i = 0; i < inputs.length; i++) {
            let field = inputs[i];
            if (field.tagName.toLowerCase() != "input" || field.attributes["type"].value != "text") {
                continue
            }            
            if (cachedUserId != null) {
                field.value = cachedUserId;
            }
        }
    }
    
    const cachedUserIdSpan = document.getElementById("cachedUserId");
    if (cachedUserIdSpan != null) {
        if (cachedUserId != null) {
            cachedUserIdSpan.textContent = cachedUserId;
        } else {
            cachedUserIdSpan.textContent = "Anonymous";
        }
    }
}

function cacheUserId() {
    let userIdField = document.getElementById("userIdField");
    localStorage.setItem('userId', userIdField.value);
    console.log(`Cached user id: ${userIdField.value}`);
}