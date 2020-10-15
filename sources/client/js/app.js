
const tableElem = document.getElementById("table-body");
const tableVoters = document.getElementById("table-voters-body");
const candidateOptions = document.getElementById("candidate-options");
const voteForm = document.getElementById("vote-form");

const voterArea = document.getElementById("voter-area");
const chairPersonArea = document.getElementById("chairperson-area");

var myAddress;
var eleicao;
var chairperson;
const CONTRACT_ADDRESS = "0xC6ea46D3C7F727ADe47334fF539dcC50e9F7e124"; /**Voter 1 */


const ethEnabled = () => {
	if (window.ethereum) {
    		window.web3 = new Web3(window.ethereum);
    		window.ethereum.enable();
    		return true;
  	}
  	return false;
}

const getMyAccounts = accounts => {
	try {
		if (accounts.length == 0) {
			alert("Você não tem contas habilitadas no Metamask!");
		} else {
			myAddress = accounts[0];
			accounts.forEach(async myAddress => {
				console.log(myAddress + " : " + await window.web3.eth.getBalance(myAddress));
			});
		}
	} catch(error) {
		console.log("Erro ao obter contas...");
	}
};

window.addEventListener('load', async function() {

	if (!ethEnabled()) {
  		alert("Por favor, instale um navegador compatível com Ethereum ou uma extensão como o MetaMask para utilizar esse dApp!");
	}
	else {
		getMyAccounts(await web3.eth.getAccounts());
		eleicao = new web3.eth.Contract(VotingContractInterface, CONTRACT_ADDRESS);
		redirectTo();
	}
});

async function redirectTo() {
	eleicao.methods.chairperson().call().then((data) => {
		if (data === myAddress) {
			console.log('e o presidente: ' + data);
			getEleitores().then((eleitores) => {
				populaEleitores(eleitores);
			});
			getEleitor(myAddress).then((eleitor) => {
				pupulaEleitor(eleitor);
				$(voterArea).show();
			});
			prepararResultadoVotacao();
			$(chairPersonArea).show();
		} else {
			console.log('Nao e o presidente: ' + data);
			getCandidatos(populaCandidatos).then((candidatos) => {
				populaCandidatosParaVoto(candidatos);
			});
			getEleitor(myAddress).then((eleitor) => {
				pupulaEleitor(eleitor);
				$(voterArea).show();
			});
		}
	 });
}

async function prepararResultadoVotacao() {
	eleicao.methods.votingClosed().call().then((votingClosed) => {
		if (votingClosed) {
			eleicao.methods.winnerName().call().then((vencedor) => {
				$('#winner-span').html(web3.utils.toUtf8(vencedor));
				$('#winner-div').show();
			});
		}
		getCandidatos(populaCandidatos).then((candidatos) => {
			populaCandidatos(candidatos, votingClosed);
			populaCandidatosParaVoto(candidatos);
		});
	});
}

async function getEleitores() {
	let count = await eleicao.methods.getVotersCount().call();
	let eleitores = [];
	for (let i = 0; i < count; i++) {
		let voterAddress = await eleicao.methods.getVoterAddress(i).call();
		eleitor = await getEleitor(voterAddress);
		eleitores.push(eleitor);
	}
	return eleitores;
}

async function getEleitor(voterAddress) {
	let eleitor = await eleicao.methods.getVoter(voterAddress).call().then((data) => {
		let voter;
		if (data[0] != '0x08c379a000000000000000000000000000000000000000000000000000000000') {
			voter = {
				name : web3.utils.toUtf8(data[0]),
				voted : data[1],
				delegated : data[2]
			};
		}
		return voter;
	});
	return eleitor;
}

async function getCandidatos()
{
	let count = await eleicao.methods.getProposalsCount().call();
	let proposals = [];
	for (let i=0; i<count; i++) {
		let proposal = await eleicao.methods.getProposal(i).call().then((data)=>{
			let proposal = {
					name : web3.utils.toUtf8(data[0]),
					voteCount : data[1]
					};
			return proposal;
		});
		proposals.push(proposal);
	}
	return proposals;
}

function populaCandidatos(candidatos, votacaoEncerrada) {
	candidatos.forEach((candidato, index) => {
		console.log(candidato.name);
		// Creates a row element.
		const rowElem = document.createElement("tr");

		// Creates a cell element for the name.
		const nameCell = document.createElement("td");
		nameCell.innerText = candidato.name;
		rowElem.appendChild(nameCell);

		if (votacaoEncerrada) {
			// Creates a cell element for the votes.
			const voteCell = document.createElement("td");
			//voteCell.id = "vote-" + candidato.name; 
			voteCell.innerText = candidato.voteCount;
			rowElem.appendChild(voteCell);
		}

		// Adds the new row to the voting table.
		tableElem.appendChild(rowElem);
	});
}

function populaCandidatosParaVoto(candidatos) {
	candidatos.forEach((candidato, index) => {
		console.log(candidato.name);
		// Creates an option for each candidate
		const candidateOption = document.createElement("option");
		candidateOption.value = index;
		candidateOption.innerText = candidato.name;
		candidateOptions.appendChild(candidateOption);
	});
}

function populaEleitores(eleitores) {
	eleitores.forEach((eleitor, index) => {
		// Creates a row element.
		const rowElem = document.createElement("tr");

		// Creates a cell element for the name.
		const nameCell = document.createElement("td");
		nameCell.innerText = eleitor.name;
		rowElem.appendChild(nameCell);

		// Creates a cell element for the votes.
		const votedCell = document.createElement("td");
		votedCell.id = "vote-" + eleitor.name; 
		votedCell.innerText = eleitor.voted && !eleitor.delegated;
		rowElem.appendChild(votedCell);

		// Creates a cell element for the delegate.
		const delegatedCell = document.createElement("td");
		delegatedCell.id = "delegate-" + eleitor.delegated; 
		delegatedCell.innerText = eleitor.delegated;
		rowElem.appendChild(delegatedCell);

		// Adds the new row to the voting table.
		tableVoters.appendChild(rowElem);
	});
}

function pupulaEleitor(eleitor) {
	if (eleitor) {
		$('#voter-name-span').html(eleitor.name);
		if (eleitor.delegated) {
			$('#voter-status-span').html('Direito a voto delegado');
		} else if (eleitor.voted) {
			$('#voter-status-span').html('Voto computado');
		} else {
			$('#voter-status-span').html('Voto pendente');
			$('#delegate-vote-form').show();
			$('#vote-form').show();
		}
	} else {
		$('#voter-status-span').html('Sem direito a voto');
	}
}

$("#btnVote").on('click',function(){
	candidato = $("#candidate-options").children("option:selected").val();

        eleicao.methods.vote(candidato).send({from: myAddress})
	       .on('receipt',function(receipt) {
			//getCandidatos(eleicao, populaCandidatos);
			windows.location.reaload(true);
		})
		.on('error',function(error) {
			alert(error.message);
			return;     
		});  

});

$("#btn-add-proposal").on('click',function(){
	let candidato = $("#add-proposal-input").val();

	eleicao.methods.addProposal(web3.utils.utf8ToHex(candidato)).send({from: myAddress})
	.on('confirmation', function(confNumber, receipt, latestBlockHash) { 
		location.reload();
	})
	.on('error',function(error) {
		alert(error.message);
		return;
	});
});

$("#btn-add-voter").on('click',function(){
	let endereco = $("#add-voter-address-input").val();
	let nome = $("#add-voter-name-input").val();
	let nomeHex = web3.utils.utf8ToHex(nome);
	
	
	eleicao.methods.giveRightToVote(endereco, nomeHex).send({from: myAddress})
	.on('confirmation', function(confNumber, receipt, latestBlockHash) { 
		location.reload();
	})
	.on('error',function(error) {
		alert(error.message);
		return;
	});
});

$("#btn-delegate-vote").on('click',function(){
	let endereco = $("#delegate-vote-input").val();
	
	eleicao.methods.delegate(endereco).send({from: myAddress})
	.on('confirmation', function(confNumber, receipt, latestBlockHash) { 
		location.reload();
	})
	.on('error',function(error) {
		alert(error.message);
		return;
	});
});

$("#btn-close-voting").on('click',function(){
	eleicao.methods.closeVoting().send({from: myAddress})
	.on('confirmation', function(confNumber, receipt, latestBlockHash) { 
		location.reload();
	})
	.on('error',function(error) {
		alert(error.message);
		return;
	});
});