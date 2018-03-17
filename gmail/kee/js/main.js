// https://stackoverflow.com/questions/2909367/can-you-determine-if-chrome-is-in-incognito-mode-via-a-script
function ifIncognito(incog,func){
    var fs = window.RequestFileSystem || window.webkitRequestFileSystem;
    if (!fs)  console.log("checking incognito failed");
    else {
        if(incog) fs(window.TEMPORARY, 100, ()=>{}, func);
        else      fs(window.TEMPORARY, 100, func, ()=>{});
    }
}

var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));


function onPageLoad(){
    document.getElementById('subbed').value = JSON.stringify(qs, null, '\t');

    var target = document.getElementsByTagName("input")[0];
    target.focus();
    target.click();

    ifIncognito(true,  ()=>{
        document.querySelector('body').className = "grey-bg";
    });
    
    ifIncognito(false,  ()=>{
        document.querySelector('body').className = "white-bg";
    });
}
onPageLoad();


function coverClickHandler(event){
    document.getElementById('cover').style.display = 'none';
    // show keyboard on android
    document.querySelector('#form1 input').focus();
    document.querySelector('#form1 input').click();
}
document.getElementById('cover').addEventListener("click", coverClickHandler);


function formSubmitClickHandler(event){
    document.getElementById('form1').submit();
}
document.getElementById('submitButton').addEventListener("click", formSubmitClickHandler);

function pageVisibleHandler(event){
    //if (document.visibilityState === 'visible') return;
    document.getElementById('cover').style.display = '';
}
document.addEventListener("visibilitychange", pageVisibleHandler);
document.addEventListener('blur', pageVisibleHandler);
window.addEventListener('blur', pageVisibleHandler);
window.addEventListener('pagehide', pageVisibleHandler);
window.addEventListener('unload', pageVisibleHandler);
window.addEventListener('beforeunload', pageVisibleHandler);