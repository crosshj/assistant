#!/bin/sh
rm -rf ./en-us-adapt
cp -a en-us en-us-adapt

./bin/map_adapt \
    -moddeffn en-us/mdef \
    -ts2cbfn .cont. \
    -meanfn en-us/means \
    -varfn en-us/variances \
    -mixwfn en-us/mixture_weights \
    -tmatfn en-us/transition_matrices \
    -accumdir ./accum \
    -mapmeanfn en-us-adapt/means \
    -mapvarfn en-us-adapt/variances \
    -mapmixwfn en-us-adapt/mixture_weights \
    -maptmatfn en-us-adapt/transition_matrices
