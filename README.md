# Introduction
Table management in an LGS can become a tricky job.
At best you'll spend a lot of time allocating players to tables,
but they'll be playing at equal levels and have a good time.
At worst you're ordering players around randomly in no time at all,
but players' power levels are heavily mis-aligned and may introduce
enough imbalance to ruin the experience for the pod.

This project attempts to automate this table ordering process, by taking into consideration:
* power level imbalance
* players who want to sit together
* players who do not want to sit together (or should be avoided to
    pair together for any reason)
* and filling each table to the maximum of 4

Technical explanation of the ordering process:
```
    It does this via an A* search algorithm, using heuristic evaluation for giving tables a heuristic 'score'
    The more violations a table has (i.e. power imbalance or pairing blacklists) the higher this score will be.
    The algorithm starts at the starting node, with no players sorted, then expand new unexplored nodes to a MinHeap
    And then expand the nodes of the lowest-cost successor node.
    The search tree space for this kind of problem is something along the lines of N^N, but with the state's definition that seats
    within a table are not unique, and neither are tables, the search tree is reduced to pow(N - 4).
    The complete size of the search space lies around C(N, N-4)
```


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

    Primary Pick & Secondary picks
        Players should have primary and secondary picks on powerlevel.
        If the primary doesn't match the pod, there should be a slight score modifier.
