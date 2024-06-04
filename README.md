# Introduction
TODO: do introduction

## Setup
This project develops the javascript code used in the html document using typescript via the typescript compiler.

You can fetch this compiler using npm:
> npm -g typescript

Snuffs out errors related to Sets not being valid objects.
> npm install @types/node --save-dev

Compiling the code works as follows:
> tsc -m es2020 --downlevelIteration --skipLibCheck ts/file.ts

# TODOS:

    Add/Remove pod after pairing
        There should always be an interactive setup for pairings, even before sorting
        It should be possible to add a pod to the setup, representing a new empty table
        It should also be possible to remove a pod that's been added
            NOTE: removing a pod should relocate each player in the pod to the unpaired
                section

    Heuristic selection from play history
        Keep track of players that have played with eachother
        This can be from import/exporting file or other methods
        The PodSorter should try pair people that have played least together 