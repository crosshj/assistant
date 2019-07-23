### Install node-pocketsphinx

refer to node-pocketsphinx readme and history.txt
installation from history.txt was done on Mac


### Cleanup / adjust audio files for transcription

https://stackoverflow.com/questions/44159621/how-to-denoise-audio-with-sox

ffmpeg -i {input.wav} -ac 1 -ab 16k {output.wav}
// ac changes audio channel (mix down to 1 channel)
// ab changes audio bitrate (16k)

ffmpeg -i infile.ext -codec:v copy -af pan="mono: c0=FL" outfile.ext
(stream copy, left channel)

### tuning results from pocketsphinx

https://cmusphinx.github.io/wiki/tutorialtuning/
https://cmusphinx.github.io/wiki/tutorialadapt/
http://clagnut.com/blog/2380/#English_phonetic_pangrams
https://linguistics.stackexchange.com/questions/9315/does-sample-text-exist-that-includes-most-english-sounds-represented-by-the-inte


### https://cmusphinx.github.io/wiki/tutorialadapt/

(see shell scripts in ./converters/sphinx/training)


