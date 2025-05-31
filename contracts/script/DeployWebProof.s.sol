// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {WebProofProver} from "../src/WebProofProver.sol";
import {WebProofVerifier} from "../src/WebProofVerifier.sol";

contract DeployWebProofScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy WebProofProver first
        WebProofProver prover = new WebProofProver();
        console.log("WebProofProver deployed at:", address(prover));

        // Deploy WebProofVerifier with the prover address
        WebProofVerifier verifier = new WebProofVerifier(address(prover));
        console.log("WebProofVerifier deployed at:", address(verifier));

        vm.stopBroadcast();

        console.log("Deployment completed successfully!");
        console.log("Prover address:", address(prover));
        console.log("Verifier address:", address(verifier));
    }
} 