function loadPage() {
    addPlayer("Maximus Timmy", Powerlevel.CASUAL);
    addPlayer("Bruhman Lower", Powerlevel.MEDIUM);
    addPlayer("John Doe", Powerlevel.MEDIUM);
    addPlayer("Peter Rizzman", Powerlevel.COMP);
    addPlayer("Chad.", Powerlevel.COMP);
}
var playerTemplateEl = document.getElementById('player-container-template');
var playerContainer = document.getElementById('players-container');
var playerCount = 0;
var Powerlevel = {
    CASUAL: 1,
    MEDIUM: 2,
    HIGH: 3,
    COMP: 4
};
function getPowerClass(powerLevel) {
    var powerStr = "power-";
    var level = "";
    switch (powerLevel) {
        case (Powerlevel.CASUAL):
            level = "casual";
            break;
        case (Powerlevel.MEDIUM):
            level = "medium";
            break;
        case (Powerlevel.HIGH):
            level = "high";
            break;
        case (Powerlevel.COMP):
            level = "comp";
            break;
        default:
            level = "err";
            break;
    }
    return powerStr + level;
}
function getPowerVerboseName(powerLevel) {
    var powerStr = "";
    switch (powerLevel) {
        case (Powerlevel.CASUAL):
            powerStr = "Casual/Precon";
            break;
        case (Powerlevel.MEDIUM):
            powerStr = "Medium";
            break;
        case (Powerlevel.HIGH):
            powerStr = "High";
            break;
        case (Powerlevel.COMP):
            powerStr = "CEDH";
            break;
        default:
            powerStr = "Error";
            break;
    }
    return powerStr;
}
function removePlayer(playerId) {
    var p = document.getElementById(playerId);
    if (p !== null) {
        p.remove();
    }
}
function addPlayer(name, powerLevel) {
    var _a;
    playerCount++;
    var newPlayerEl = playerTemplateEl.cloneNode(true);
    // replace template id
    var newId = "player-" + playerCount;
    newPlayerEl.setAttribute('id', newId);
    // add attributes
    var a = newPlayerEl.querySelector('.player-name').innerHTML = name;
    var levelCls = getPowerClass(powerLevel);
    var levelName = getPowerVerboseName(powerLevel);
    var powerContainer = newPlayerEl.querySelector('.player-power-container');
    powerContainer.classList.add(levelCls);
    powerContainer.innerHTML = levelName;
    newPlayerEl.setAttribute('value', String(powerLevel));
    // add remove button functionalities
    (_a = newPlayerEl.querySelector('.rm-player-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener("click", function (el) {
        removePlayer(newId);
    });
    // add node to player list
    playerContainer.appendChild(newPlayerEl);
}
loadPage();
