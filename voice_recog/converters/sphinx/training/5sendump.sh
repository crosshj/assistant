#!/bin/sh

./bin/mk_s2sendump \
    -pocketsphinx yes \
    -moddeffn en-us-adapt/mdef \
    -mixwfn en-us-adapt/mixture_weights \
    -sendumpfn en-us-adapt/sendump
