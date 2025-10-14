const usedTeamIds = new Set();

const generateTeamId = () => {
  let teamId;
  let attempts = 0;
  
  do {
    // Generate 6-digit number between 100000 and 999999
    teamId = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
    
    // Safety check to prevent infinite loop
    if (attempts > 100) {
      teamId = Date.now().toString().slice(-6);
      break;
    }
  } while (usedTeamIds.has(teamId));
  
  usedTeamIds.add(teamId);
  return teamId;
};

const clearUsedTeamIds = () => {
  usedTeamIds.clear();
};

module.exports = {
  generateTeamId,
  clearUsedTeamIds
};