### Install node-pocketsphinx

refer to node-pocketsphinx readme and history.install.txt (converters/sphinx)
installation from history.install.txt was done on Mac


### Cleanup / adjust audio files for transcription

https://stackoverflow.com/questions/44159621/how-to-denoise-audio-with-sox

ffmpeg -i {input.wav} -ac 1 -ab 16k {output.wav}
// ac changes audio channel (mix down to 1 channel)
// ab changes audio bitrate (16k)

ffmpeg -i infile.ext -codec:v copy -af pan="mono: c0=FL" outfile.ext
(stream copy, left channel)

### tuning results from pocketsphinx

https://cmusphinx.github.io/wiki/tutorialtuning/

# accoutsic model
https://cmusphinx.github.io/wiki/tutorialadapt/
http://clagnut.com/blog/2380/#English_phonetic_pangrams
https://linguistics.stackexchange.com/questions/9315/does-sample-text-exist-that-includes-most-english-sounds-represented-by-the-inte

# language model
https://cmusphinx.github.io/wiki/tutoriallm/


### https://cmusphinx.github.io/wiki/tutorialadapt/

(see shell scripts in ./converters/sphinx/training)


### subtitles / results mapped to original audio with timing

get timing in node-pocketsphinx - https://github.com/cmusphinx/node-pocketsphinx/blob/master/demo/test.js#L21

not self-contained solution (would prefer video file gets rendered) - https://superuser.com/questions/1199846/play-audio-only-file-with-subtitles-possibly-use-some-still-image-as-stub

https://matroska.org/technical/specs/subtitles/srt.html

### phoneme recognition    
https://cmusphinx.github.io/wiki/phonemerecognition/
