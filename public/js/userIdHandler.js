
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

function finaliseUserId() {
    let cachedUserId = localStorage.getItem('userId');

    /// If user did not input user ID:
    if (cachedUserId === null || cachedUserId === '') {
        const anonId = makeID(8);
        localStorage.setItem('userIdAnon', anonId);
        localStorage.removeItem('userId');
        console.log(`Anon ID generated: {anonId}`);
    }
    console.log(localStorage.getItem('userIdAnon'));
}

function makeID(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}