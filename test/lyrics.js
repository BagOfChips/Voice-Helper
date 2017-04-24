const api_key = process.env.GENIUS_KEY;
var lyricist = require('lyricist')(api_key);

lyricist.song({search: "Kanye West Famous"}, function (err, song) {
  console.log("%s", song.lyrics);
});