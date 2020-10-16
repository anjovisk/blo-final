pragma solidity >=0.4.22 <0.6.0;

/// @title Voting with delegation.
contract Voting {
    //Estrutura do eleitor
    struct Voter {
        uint weight; // weight is accumulated by delegation
        bool voted;  // if true, that person already voted
        address delegate; // person delegated to
        bytes32 name; //person name: SOLICITADO NO TRABALHO FINAL
        uint vote;   // index of the voted proposal
    }

    // Estrutura do candidato
    struct Proposal {
        bytes32 name;   // short name (up to 32 bytes)
        uint voteCount; // number of accumulated votes
    }
    
    //Indica se a eleição está encerrada ou não
    bool public votingClosed = false;

    //Responsável pela eleição
    address public chairperson;

    //Lista de eleitores (estrutura Voter)
    mapping(address => Voter) private voters;

    //Lista de candidatos
    Proposal[] private proposals;
    
    //Lista de endereço dos eleitores
    address[]  private votersAddress;

    /// Create a new ballot to choose one of `proposalNames`.
    constructor() public {
        chairperson = msg.sender;
        /*
        bytes32[4] memory proposalNames = [bytes32("Flamengo"), bytes32("Palmeiras"), bytes32("Atletico"), bytes32("Tabajara FC")];
        voters[chairperson].weight = 1;
        voters[chairperson].name = "chairperson";
        votersAddress.push(msg.sender);

        // For each of the provided proposal names,
        // create a new proposal object and add it
        // to the end of the array.
        for (uint i = 0; i < proposalNames.length; i++) {
            // `Proposal({...})` creates a temporary
            // Proposal object and `proposals.push(...)`
            // appends it to the end of `proposals`.
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0
            }));
        }
        */
    }
    
    //Adicionar um cadidato
    function addProposal(bytes32 proposalName) public {
        //Não permitir adição de candidato caso a eleição tenha sido encerrada
        require(!votingClosed, "Voting closed.");
        //Somente o responsável pela eleição pode adicionar candidatos
        require(
            msg.sender == chairperson,
            "Only chairperson can add proposal."
        );
        proposals.push(Proposal({
            name: proposalName,
            voteCount: 0
        }));
    }

    //Conceder direito a voto
    function giveRightToVote(address voter, bytes32 personName) public {
        //Não permitir conceder direito a voto se a eleição tiver sido encerrada
        require(!votingClosed, "Voting closed.");
        //Não permitir conceder direito a voto se a eleição tiver sido encerrada
        require(!hasVotingRights(voter), "Address already has voting rights.");
        //Somente o responsável pela eleição pode conceder direito a votos
        require(
            msg.sender == chairperson,
            "Only chairperson can give right to vote."
        );
        /*
        require(
            keccak256(abi.encodePacked(personName)) == keccak256(abi.encodePacked("0")),
            "Person name must be filled."
        );
        */
        require(voters[voter].weight == 0);
        voters[voter].weight = 1;
        voters[voter].name = personName;
        votersAddress.push(voter);
    }

    /// Delegar voto para outro eleitor
    function delegate(address to) public {
        //Não permitir que voto seja delega caso a eleição tenha sido encerrada
        require(!votingClosed, "Voting closed.");
        //Somente pode delegar quem tiver direito a voto
        require(hasVotingRights(msg.sender), "Address has no voting rights.");
        // assigns reference
        Voter storage sender = voters[msg.sender];
        //Não permitir que o eleitor delegue o voto caso ja tenha votado
        require(!sender.voted, "You already voted.");
        //Não permite que um eleitor delegue voto para ele mesmo
        require(to != msg.sender, "Self-delegation is disallowed.");

        while (voters[to].delegate != address(0)) {
            to = voters[to].delegate;

            // We found a loop in the delegation, not allowed.
            require(to != msg.sender, "Found loop in delegation.");
        }
        /*CONTRATO - ITEM C
        bool canVote = false;
        for (uint v = 0; v < votersAddress.length; v++) {
            if (to == votersAddress[v]) {
                canVote = true;
                break;
            }
        }
        require(canVote, "Informed address is not a voter.");
        */
        //Só delegar direito a voto para eleitores com direito a voto
        require(hasVotingRights(to), "Informed address is not a voter.");
        
        sender.voted = true;
        sender.delegate = to;
        Voter storage delegate_ = voters[to];
        if (delegate_.voted) {
            // If the delegate already voted,
            // directly add to the number of votes
            proposals[delegate_.vote].voteCount += sender.weight;
        } else {
            // If the delegate did not vote yet,
            // add to her weight.
            delegate_.weight += sender.weight;
        }
    }

    /// Votar
    function vote(uint proposal) public {
        require(!votingClosed, "Voting closed.");
        require(hasVotingRights(msg.sender), "Address has no voting rights.");
        Voter storage sender = voters[msg.sender];
        require(sender.weight != 0, "Has no right to vote");
        require(!sender.voted, "Already voted.");
        sender.voted = true;
        sender.vote = proposal;

        // If `proposal` is out of the range of the array,
        // this will throw automatically and revert all
        // changes.
        proposals[proposal].voteCount += sender.weight;
    }

    /// @dev Computes the winning proposal taking all
    /// previous votes into account.
    function winningProposal() private view
            returns (uint winningProposal_)
    {
        require(votingClosed, "Voting was not closed.");
        uint winningVoteCount = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    // Calls winningProposal() function to get the index
    // of the winner contained in the proposals array and then
    // returns the name of the winner
    function winnerName() public view
            returns (bytes32 winnerName_)
    {
        require(votingClosed, "Voting was not closed.");
        winnerName_ = proposals[winningProposal()].name;
    }
    
    function getProposalsCount() public view 
            returns (uint count) 
    {
        count = proposals.length;
    }
    
    function getProposal(uint index) public view
            returns (bytes32 name, uint voteCount)
    {
        name = proposals[index].name;
        if (votingClosed) {
            voteCount = proposals[index].voteCount;
        }
    }
    
    /*CONTRATO - ITEM B*/
    function getVoter(address voter) public view
            returns (bytes32 name, bool voted, bool delegated)
    {
        require(hasVotingRights(voter), "Address has no voting rights.");
        for (uint v = 0; v < votersAddress.length; v++) {
            if (votersAddress[v] == voter) {
                name = voters[voter].name;
                voted = voters[voter].voted;
                delegated = voters[voter].delegate != address(0);
            }
        }
    }
    
    //Checar se endereço é um eleitor com direito a voto
    function hasVotingRights(address voter) private view
            returns (bool voterFound)
    {
        voterFound = false;
        for (uint v = 0; v < votersAddress.length; v++) {
            if (votersAddress[v] == voter) {
                voterFound = true;
            }
        }
    }
    
    function getVotersCount() public view returns (uint count) {
        count = votersAddress.length;
    }
    
    function getVoterAddress(uint index) public view 
        returns (address voter) {
        voter = votersAddress[index];
    }
    
    //Encerra a eleição
    function closeVoting() public {
        require(
            msg.sender == chairperson,
            "Only chairperson can give right to close voting."
        );
        require(!votingClosed, "Voting closed.");
        votingClosed = true;
    }
}