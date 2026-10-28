const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      App.switchTab('tab-hall');
      const dayTitle = document.getElementById('questDayTitle')?.textContent?.trim();
      const taskCheckboxes = Array.from(document.querySelectorAll('.task-checkbox'));
      const beforeExp = App.saveData.progress.exp || 0;
      
      // Click first checkbox
      if (taskCheckboxes.length > 0) {
        taskCheckboxes[0].click();
      }
      
      const afterExp = App.saveData.progress.exp || 0;
      const checkedStates = Array.from(document.querySelectorAll('.task-checkbox')).map(c => c.checked);
      
      return {
        dayTitle,
        taskCount: taskCheckboxes.length,
        beforeExp,
        afterExp,
        checkedStates
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 80,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('QUEST_CHECK_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
