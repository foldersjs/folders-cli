var blessed = require('blessed');
var screen = blessed.screen();

var list = blessed.list({
  parent: screen,
  align: 'center',
  mouse: true,
  fg: 'blue',
  bg: 'default',
  border: {
    type: 'ascii',
    fg: 'default',
    bg: 'default'
  },
  width: '50%',
  height: '50%',
  top: 'center',
  left: 'center',
  selectedBg: 'green',
  items: [
    'Serve window.io',
    'Serve interally',
    'Backend Provider',
    'Window.io client'
  ],
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'yellow'
    },
    style: {
      inverse: true
    }
  }
});

screen.append(list);

list.select(0);

list.prepend(blessed.text({
  left: 2,
  content: ' Server options '
}));

if (screen.autoPadding) {
  list.children[0].rleft = -list.ileft + 2;
  list.children[0].rtop = -list.itop;
}

list.on('keypress', function(ch, key) {
  if (key.name === 'up' || key.name === 'k') {
    list.up();
    screen.render();
    return;
  } else if (key.name === 'down' || key.name === 'j') {
    list.down();
    screen.render();
    return;
  }
});


screen.on('keypress', function(ch, key) {
  if (key.name === 'tab') {
    return key.shift
      ? screen.focusPrevious()
      : screen.focusNext();
  }
  //if (key.name === 'i') {
  //  return input.readInput(function(err, value) {
  //    ;
  //  });
  //}
  //if (key.name === 'e') {
  //  return input.readEditor(function(err, value) {
  //    ;
  //  });
  //}
  if (key.name === 'escape' || key.name === 'q') {
    return process.exit(0);
  }
});

screen.key('C-z', function() {
  screen.sigtstp();
});

list.focus();

//screen.on('element click', function(el) {
//  el.focus();
//});

screen.render();

