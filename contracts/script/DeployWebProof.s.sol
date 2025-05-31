// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {WebProofProver} from "../src/WebProofProver.sol";
import {WebProofVerifier} from "../src/WebProofVerifier.sol";
import {Strings} from "@openzeppelin-contracts-5.0.1/utils/Strings.sol";

contract DeployWebProofScript is Script {
    using Strings for address;

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

        // Update .env file in UI directory
        updateEnvFile(address(prover), address(verifier));
    }

    function updateEnvFile(address proverAddress, address verifierAddress) internal {
        string memory proverAddressStr = proverAddress.toHexString();
        string memory verifierAddressStr = verifierAddress.toHexString();
        
        // Read current .env file
        string memory envPath = "../ui/.env";
        
        try vm.readFile(envPath) returns (string memory) {
            console.log("Updating .env file with new contract addresses...");
            
            // Create sed commands to update the addresses
            string[] memory sedCommands = new string[](4);
            
            // Update prover address
            sedCommands[0] = "sed";
            sedCommands[1] = "-i";
            sedCommands[2] = string(abi.encodePacked("s/NEXT_PUBLIC_PROVER_ADDRESS=0x[a-fA-F0-9]*/NEXT_PUBLIC_PROVER_ADDRESS=", proverAddressStr, "/"));
            sedCommands[3] = envPath;
            
            vm.ffi(sedCommands);
            
            // Update verifier address
            sedCommands[2] = string(abi.encodePacked("s/NEXT_PUBLIC_VERIFIER_ADDRESS=0x[a-fA-F0-9]*/NEXT_PUBLIC_VERIFIER_ADDRESS=", verifierAddressStr, "/"));
            
            vm.ffi(sedCommands);
            
            console.log("Successfully updated .env file!");
            console.log("New PROVER_ADDRESS:", proverAddressStr);
            console.log("New VERIFIER_ADDRESS:", verifierAddressStr);
            
        } catch {
            console.log("Warning: Could not update .env file automatically.");
            console.log("Please manually update the following addresses in ui/.env:");
            console.log("NEXT_PUBLIC_PROVER_ADDRESS=", proverAddressStr);
            console.log("NEXT_PUBLIC_VERIFIER_ADDRESS=", verifierAddressStr);
        }
    }
} 