TODOS:

    Interactive player list
        A list of all players needs to represent all players that are considered
        Removing a player will also remove them from the unpaired section if applicable
        or remove him from a pod if the player is not located in the unpaired section.

    representation for a table/pod
        An element for representing a playgroup needs to be added
        This should be an element with the players name and color representing
        the power level of said player

    unpaired section
        A player who is unpaired should be in a list to the side
        Unpaired players follow the same representation as those on a table/pod
        Unpaired player elements need to be draggable so they can be placed in a pod

    form to add new players
        A form to add new players should be added
        The form adds a player to the complete list of players
        It should also add the player to the unpaired list

    whitelist
        On the tempalte there should be a functionality to whitelist.
        whitelisting should promote 2 players to be paired with eachother.
        whitelist links should be able to be removed, in the case a link is added
        erroneously.
        (This could be nice to setup as drag over another player)
        (Also a cool representation for whitelisting could be keeping them close
        together on the player list with a marker for them)

    blacklisting
        Inside the form there should be a functionality to blacklist.
        blacklisting should prevent 2 players to be paired with eachother.
        A blacklist link should be able to be removed, in the case a link is added
        erroneously.
        (This could be nice to utilize the same setup as whitelisting, it could
        open a window with left as whitelist and right as blacklist)
        (Representing blacklists could be difficult, a way of doing this could be
        showing an ID of the blacklisted player, which when hovered over would highlight
        the player it's representing of)
        
    Add/Remove pod after pairing
        There should always be an interactive setup for pairings, even before sorting
        It should be possible to add a pod to the setup, representing a new empty table
        It should also be possible to remove a pod that's been added
            NOTE: removing a pod should relocate each player in the pod to the unpaired
                section

    drag & drop after pairings
        After pairings, elements should be able to be drag & dropped
        The AI might not return perfect results, so a post-pairing
        revision is necessary

    Heuristic selection from play history
        Keep track of players that have played with eachother
        This can be from import/exporting file or other methods
        The PodSorter should try pair people that have played least together 

CSP approach?

    The CSP model needs to take into regard a couple of variables
    Players should be sorted with regard to
        * powerlevel - Matching powerlevels are important, but adjacent levels
            should not be completely excluded. However distant powerlevels should
            not be paired
        
        * whitelist - Players who have a whitelist link between eachother should
            always be paired together.
        
        * blacklist - Players who have a blacklist link between eachother should
            never be paired together.

        * history - Players who have a history of being paired together should be
            avoided to be paired together

    Variables:
        Players: A set of variables X = {X1, X2, ..., Xn}
            Each player variable has a set of 3 descriptive/constant variables:
                Player.PowerLevel: representing the level the player wants to play at
                Player.Whitelist: a set of players denoting the players they want to be seated with
                Player.Blacklist: a set of players denoting the players they DO NOT want to be seated with

    Domains:
        Each player X has a domain Di of possible integer values: 1 to N
        where is typically N >= X.length / 2
            This represents the pod they should be located to.
        
        Each player has a subdomain of descriptive values with domains:
            Player.PowerLevel: an integer between 1 and 4
            Player.Whitelist: A set of Player variables Xp that exist
            Player.Blacklist: A set of Player variables Xp that exist

    Constraints:
        No more than 4 players can be assigned a variable of their domains to the same value
            this prevents players to be seated in a pod with more than 5 players
            This is presented in code as a global variable,
            keeping track how many playrs are in each pod

        A Player X1.PowerLevel should match Player X2.PowerLevel
            X1.PowerLevel == X2.PowerLevel
            NOTE: this is for the starter model, TODO is making the powerlevel a
                range from X1.PowerLevel <= X2.PowerLevel - 1 OR X1.PowerLevel >= X2.Powerlevel + 1
                But this needs some heuristic to prefer pairings with EQ

        A Player X1.WhiteList SHOULD contain X2
            X2 in X1.Whitelist
        
        A Player X1.Blacklist CANNOT contain X2
            X2 not in X1.Blacklist
