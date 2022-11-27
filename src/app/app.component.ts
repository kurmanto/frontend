import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ethers } from 'ethers';
import tokenJson from '../assets/MyToken.json';
import ballotJson from '../assets/Ballot.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  provider: ethers.providers.Provider;
  wallet: ethers.Wallet | undefined;
  tokenAddress: string | undefined;
  ballotAddress: string | undefined;
  ballotContract: ethers.Contract | undefined;
  tokenContract: ethers.Contract | undefined;
  etherBalance: number | undefined;
  tokenBalance: number | undefined;
  votePower: number | undefined;
  privateOrMnemonic: string | undefined;
  winnerName: string | undefined;
  winningIndex: string | undefined;
  targetBlock: string | undefined;
  proposals: string[] | undefined;

  importToggle = false;
  importFlag = false;
  validAddressFlag = false;
  validKeyFlag = false;
  keySelected = false;

  constructor(private http: HttpClient) {
    this.provider = ethers.getDefaultProvider('goerli');
  }

  clickImportButton() {
    this.importToggle = !this.importToggle;
    this.importFlag = !this.importFlag;
  }

  setPrivateOrMnemonic(key: string) {
    this.privateOrMnemonic = key;
    this.keySelected = true;
  }

  async importWallet(walletAddressIn: string, mnemonicOrKey: string) {
    /^0x[a-fA-F0-9]{40}$/g.test(walletAddressIn)
      ? (this.validAddressFlag = true)
      : (this.validAddressFlag = false);
    mnemonicOrKey ? (this.validKeyFlag = true) : (this.validKeyFlag = false);
    let errorMsg = [];

    if (!this.keySelected) errorMsg.push('A type of key must be selected.');
    if (!this.validAddressFlag) errorMsg.push('Address is invalid.');
    if (!this.validKeyFlag)
      errorMsg.push('Mnemonic/Private key input should not be empty.');

    if (errorMsg.length > 0) {
      let fullMsg = '';
      for (let index = 0; index < errorMsg.length; index++) {
        fullMsg += `* ${errorMsg[index]}\n`;
      }

      alert(fullMsg);
      return;
    }

    if (this.privateOrMnemonic == 'mnemonic') {
      try {
        this.wallet = ethers.Wallet.fromMnemonic(mnemonicOrKey).connect(
          this.provider
        );
      } catch (error) {
        alert(error);
      }
    } else if (this.privateOrMnemonic == 'private') {
      try {
        this.wallet = new ethers.Wallet(mnemonicOrKey).connect(this.provider);
      } catch (error) {
        alert(error);
      }
    }

    this.connectDefaultToken();
  }

  async createWallet() {
    this.wallet = ethers.Wallet.createRandom().connect(this.provider);
    this.connectDefaultToken();
  }

  async connectDefaultToken() {
    this.http
      .get<any>('http://localhost:3000/token-address')
      .subscribe((ans) => {
        this.tokenAddress = ans.result;
        if (this.tokenAddress) {
          this.connectTokenContract(this.tokenAddress);
        }
      });
  }

  private connectTokenContract(address: string) {
    this.tokenContract = new ethers.Contract(
      address,
      tokenJson.abi,
      this.wallet
    );
    this.updateInfo();
  }

  private updateInfo() {
    if (this.wallet && this.tokenContract) {
      this.wallet.getBalance().then((balanceBN: ethers.BigNumberish) => {
        this.etherBalance = parseFloat(ethers.utils.formatEther(balanceBN));
      });
      this.tokenContract['balanceOf'](this.wallet.address).then(
        (balanceBN: ethers.BigNumberish) => {
          this.tokenBalance = parseFloat(ethers.utils.formatEther(balanceBN));
        }
      );
      this.tokenContract['getVotes'](this.wallet.address).then(
        (votesBN: ethers.BigNumberish) => {
          this.votePower = parseFloat(ethers.utils.formatEther(votesBN));
        }
      );
    }
  }

  claimTokens() {
    this.http
      .post<any>('http://localhost:3000/claim-tokens', {
        address: this.wallet?.address,
      })
      .subscribe((ans) => {
        // const txHash = ans.result;
        // this.provider.getTransaction(txHash).then((tx) => {
        //   tx.wait().then((receipt) => {
        //     // TODO: (optional) display
        //     // TODO: Reload info my call
        //   });
        // });
        this.updateInfo();
        console.log(ans);
      });
      this.updateInfo();
  }

  connectBallot(address: string) {
    if (!address || !/^0x[a-fA-F0-9]{40}$/g.test(address)) {
      alert('Enter a valid ballot address.');
      return;
    }
    try {
      this.http
        .post<any>('http://localhost:3000/connect-ballot-contract', {
          address: address,
        })
        .subscribe((ans) => {
          console.log(`request result: \n${ans.result}`);
        });
      this.ballotContract = new ethers.Contract(
        address,
        ballotJson.abi,
        this.wallet
      );
      this.ballotAddress = this.ballotContract.address;
      this.getBallotInfo();
    } catch (error) {
      alert(error);
    }
  }

  delegate() {}

  castVote(voteId: string, amount: string) {
    if (this.ballotContract) 
      this.ballotContract['vote'](voteId, amount).then((ans: any) => {
        console.log(ans);
        return { result: "success" };
      })
  }

  private getBallotInfo() {
    if (this.ballotContract) {
      this.ballotContract['winnerName']().then((name: ethers.BigNumberish) => {
        this.winnerName = ethers.utils.parseBytes32String(name.toString());
      });
      this.ballotContract['winningProposal']().then(
        (index: ethers.BigNumberish) => {
          this.winningIndex = index.toString();
        }
      );
      this.ballotContract['targetBlock']().then((num: ethers.BigNumberish) => {
        this.targetBlock = num.toString();
      });
      // TODO: maybe show possible proposals
    }
  }

  // TODO: in weekend project build sevice to run all nessecery steps to backend
  // READ: https://angular.io/tutorial/toh-pt4
  // TODO: Implement Import button
  // TODO: Implement Connect button
}
