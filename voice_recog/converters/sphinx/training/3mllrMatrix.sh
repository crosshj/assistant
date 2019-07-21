#!/bin/sh

mkdir -p mllr

./bin/mllr_solve \
    -meanfn en-us/means \
    -varfn en-us/variances \
    -outmllrfn ./mllr/mllr_matrix -accumdir ./accum
