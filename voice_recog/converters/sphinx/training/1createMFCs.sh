#!/bin/sh

sphinx_fe -argfile en-us/feat.params \
        -samprate 16000 -c arctic20.fileids \
       -di . -do . -ei wav -eo mfc -mswav yes
