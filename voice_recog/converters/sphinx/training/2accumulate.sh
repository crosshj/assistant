#!/bin/sh

mkdir -p accum

./bin/bw \
 -hmmdir en-us \
 -moddeffn en-us/mdef \
 -ts2cbfn .cont. \
 -feat 1s_c_d_dd \
 -lda en-us/feature_transform \
 -cmn live \
 -cmninit 40 \
 -agc none \
 -dictfn cmudict-en-us.dict \
 -ctlfn arctic20.fileids \
 -lsnfn arctic20.transcription \
 -accumdir ./accum

