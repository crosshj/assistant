### Install node-pocketsphinx

refer to node-pocketsphinx readme and history.txt
installation from history.txt was done on Mac


### Cleanup / adjust audio files for transceription

https://stackoverflow.com/questions/44159621/how-to-denoise-audio-with-sox


### tuning results from pocketsphinx

https://cmusphinx.github.io/wiki/tutorialtuning/
https://cmusphinx.github.io/wiki/tutorialadapt/
http://clagnut.com/blog/2380/#English_phonetic_pangrams


### https://cmusphinx.github.io/wiki/tutorialadapt/

./map_adapt \
    -moddeffn en-us/mdef.txt \
    -ts2cbfn .ptm. \
    -meanfn en-us/means \
    -varfn en-us/variances \
    -mixwfn en-us/mixture_weights \
    -tmatfn en-us/transition_matrices \
    -accumdir . \
    -mapmeanfn en-us-adapt/means \
    -mapvarfn en-us-adapt/variances \
    -mapmixwfn en-us-adapt/mixture_weights \
    -maptmatfn en-us-adapt/transition_matrices

./bw \
 -hmmdir en-us \
 -moddeffn en-us/mdef \
 -ts2cbfn .cont. \
 -feat 1s_c_d_dd \
 -lda en-us/feature_transform \
 -cmn current \
 -agc none \
 -dictfn cmudict-en-us.dict \
 -ctlfn arctic20.fileids \
 -lsnfn arctic20.transcription \
 -accumdir .

