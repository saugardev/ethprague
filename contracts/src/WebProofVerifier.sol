// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {WebProofProver} from "./WebProofProver.sol";

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";

contract WebProofVerifier is Verifier {
    address public prover;
    mapping(address => string) public addressToUsername;

    constructor(address _prover) {
        prover = _prover;
    }

    function verify(Proof calldata, string memory username, address account)
        public
        onlyVerified(prover, WebProofProver.main.selector)
    {
        require(bytes(addressToUsername[account]).length == 0, "Address already has a username");
        addressToUsername[account] = username;
    }

    function getUsername(address account) public view returns (string memory) {
        return addressToUsername[account];
    }
} 