#!/bin/sh
chmod 0755 ../sphinxtrain/scripts/decode/word_align.pl
rm -rf ./6test.hyp

pocketsphinx_batch \
 -adcin yes \
 -cepdir . \
 -cepext .wav \
 -ctl arctic20.fileids \
 -lm en-us.lm.bin \
 -dict cmudict-en-us.dict \
 -hmm en-us-adapt \
 -mllr mllr/mllr_matrix \
 -hyp 6test.hyp

echo
echo

../sphinxtrain/scripts/decode/word_align.pl arctic20.transcription 6test.hyp

# en-us, en-70k-0.2.lm
# TOTAL Words: 165 Correct: 33 Errors: 132
# TOTAL Percent correct = 20.00% Error = 80.00% Accuracy = 20.00%
# TOTAL Insertions: 0 Deletions: 59 Substitutions: 73

# en-us, en-70k-0.2.lm, mllr
# TOTAL Words: 164 Correct: 53 Errors: 118
# TOTAL Percent correct = 32.32% Error = 71.95% Accuracy = 28.05%
# TOTAL Insertions: 7 Deletions: 33 Substitutions: 78

# en-us, en-us.lm.bin
# TOTAL Words: 165 Correct: 34 Errors: 131
# TOTAL Percent correct = 20.61% Error = 79.39% Accuracy = 20.61%
# TOTAL Insertions: 0 Deletions: 58 Substitutions: 73

# en-us, en-us.lm.bin, mllr
# TOTAL Words: 164 Correct: 46 Errors: 125
# TOTAL Percent correct = 28.05% Error = 76.22% Accuracy = 23.78%
# TOTAL Insertions: 7 Deletions: 33 Substitutions: 85


# --------------------------------------------------------------------

# en-us-adapt, en-70k-0.2.lm.bin, mllr
# TOTAL Words: 418 Correct: 387 Errors: 35
# TOTAL Percent correct = 92.58% Error = 8.37% Accuracy = 91.63%
# TOTAL Insertions: 4 Deletions: 16 Substitutions: 15

# en-us-adapt, en-70k-0.2.lm.bin
# TOTAL Words: 419 Correct: 357 Errors: 63
# TOTAL Percent correct = 85.20% Error = 15.04% Accuracy = 84.96%
# TOTAL Insertions: 1 Deletions: 36 Substitutions: 26


# en-us-adapt, en-us.lm.bin, mllr
# TOTAL Words: 418 Correct: 385 Errors: 36
# TOTAL Percent correct = 92.11% Error = 8.61% Accuracy = 91.39%
# TOTAL Insertions: 3 Deletions: 16 Substitutions: 17

# en-us-adapt, en-us.lm.bin
# TOTAL Words: 419 Correct: 355 Errors: 64
# TOTAL Percent correct = 84.73% Error = 15.27% Accuracy = 84.73%
# TOTAL Insertions: 0 Deletions: 37 Substitutions: 27
