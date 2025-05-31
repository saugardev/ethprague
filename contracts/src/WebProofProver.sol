// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Prover} from "vlayer-0.1.0/Prover.sol";
import {Web, WebProof, WebProofLib, WebLib} from "vlayer-0.1.0/WebProof.sol";
import {Precompiles} from "vlayer-0.1.0/PrecompilesAddresses.sol";
import {Address} from "@openzeppelin-contracts-5.0.1/utils/Address.sol";

contract WebProofProver is Prover {
    using WebProofLib for WebProof;
    using WebLib for Web;

    string public constant PROFILE_URL =
        "https://connect.garmin.com/userprofile-service/userprofile/settings";

    string public constant FITNESS_STATS_BASE_URL =
        "https://connect.garmin.com/fitnessstats-service/activity?aggregation=lifetime&groupByParentActivityType=false&groupByEventType=false&startDate=1970-01-01&endDate=";

    string public constant FITNESS_STATS_PARAMS =
        "&metric=duration&metric=distance&metric=movingDuration&metric=splitSummaries.noOfSplits.CLIMB_ACTIVE&metric=splitSummaries.duration.CLIMB_ACTIVE&metric=splitSummaries.totalAscent.CLIMB_ACTIVE&metric=splitSummaries.maxElevationGain.CLIMB_ACTIVE&metric=splitSummaries.numClimbsAttempted.CLIMB_ACTIVE&metric=splitSummaries.numClimbsCompleted.CLIMB_ACTIVE&metric=splitSummaries.numClimbSends.CLIMB_ACTIVE&metric=splitSummaries.numFalls.CLIMB_ACTIVE&metric=calories&metric=elevationGain&metric=elevationLoss&metric=avgSpeed&metric=maxSpeed&metric=avgGradeAdjustedSpeed&metric=avgHr&metric=maxHr&metric=avgRunCadence&metric=maxRunCadence&metric=avgBikeCadence&metric=maxBikeCadence&metric=avgWheelchairCadence&metric=maxWheelchairCadence&metric=avgPower&metric=maxPower&metric=avgVerticalOscillation&metric=avgGroundContactTime&metric=avgStrideLength&metric=avgStress&metric=maxStress&metric=splitSummaries.duration.CLIMB_REST&metric=beginPackWeight&metric=steps&standardizedUnits=false";

    string public constant USER_SUMMARY_BASE_URL =
        "https://connect.garmin.com/usersummary-service/usersummary/daily/";

    function main(WebProof calldata webProof, address account)
        public
        view
        returns (Proof memory, string memory, address)
    {
        Web memory web = webProof.verify(PROFILE_URL);

        string memory screenName = web.jsonGetString("displayName");

        return (proof(), screenName, account);
    }

    function getCountOfActivities(
        WebProof calldata webProof, 
        address account,
        string calldata endDate
    )
        public
        view
        returns (Proof memory, uint256, address)
    {
        string memory fullUrl = string(abi.encodePacked(
            FITNESS_STATS_BASE_URL,
            endDate,
            FITNESS_STATS_PARAMS
        ));

        Web memory web = webProof.verify(fullUrl);
        
        // Try to get the count value, but return 0 if it fails
        int256 count = int256(0);
        
        // Use jsonGetInt directly and handle any errors at transaction level
        count = web.jsonGetInt("[0].countOfActivities");

        return (
            proof(),
            uint256(count >= int256(0) ? count : int256(0)), // Ensure non-negative
            account
        );
    }

    function getTotalDistance(
        WebProof calldata webProof, 
        address account,
        string calldata endDate
    )
        public
        view
        returns (Proof memory, uint256, address)
    {
        string memory fullUrl = string(abi.encodePacked(
            FITNESS_STATS_BASE_URL,
            endDate,
            FITNESS_STATS_PARAMS
        ));

        Web memory web = webProof.verify(fullUrl);
        
        // Try to get the distance value, but return 0 if it fails
        int256 distance = int256(0);
        
        // Use a try-catch pattern by checking if the call succeeds
        bytes memory encodedParams = abi.encode(web.body, "[0].stats.all.distance.sum", uint256(3));
        (bool success, bytes memory returnData) = Precompiles.JSON_GET_FLOAT_AS_INT.staticcall(encodedParams);
        
        if (success && returnData.length > 0) {
            distance = abi.decode(returnData, (int256));
        }
        
        return (
            proof(),
            uint256(distance >= int256(0) ? distance : int256(0)), // Ensure non-negative
            account
        );
    }

    function getTotalCalories(
        WebProof calldata webProof, 
        address account,
        string calldata endDate
    )
        public
        view
        returns (Proof memory, uint256, address)
    {
        string memory fullUrl = string(abi.encodePacked(
            FITNESS_STATS_BASE_URL,
            endDate,
            FITNESS_STATS_PARAMS
        ));

        Web memory web = webProof.verify(fullUrl);
        
        // Try to get the calories value, but return 0 if it fails
        int256 calories = int256(0);
        
        // Use a try-catch pattern by checking if the call succeeds
        bytes memory encodedParams = abi.encode(web.body, "[0].stats.all.calories.sum", uint256(12));
        (bool success, bytes memory returnData) = Precompiles.JSON_GET_FLOAT_AS_INT.staticcall(encodedParams);
        
        if (success && returnData.length > 0) {
            calories = abi.decode(returnData, (int256));
        }
        
        return (
            proof(),
            uint256(calories >= int256(0) ? calories : int256(0)), // Ensure non-negative
            account
        );
    }

    function getAvgHeartRate(
        WebProof calldata webProof, 
        address account,
        string calldata endDate
    )
        public
        view
        returns (Proof memory, uint256, address)
    {
        string memory fullUrl = string(abi.encodePacked(
            FITNESS_STATS_BASE_URL,
            endDate,
            FITNESS_STATS_PARAMS
        ));

        Web memory web = webProof.verify(fullUrl);
        
        // Try to get the heart rate value, but return 0 if it fails
        int256 avgHr = int256(0);
        
        // Use a try-catch pattern by checking if the call succeeds
        bytes memory encodedParams = abi.encodePacked(web.body, "[0].stats.all.avgHr.avg", uint8(3));
        (bool success, bytes memory returnData) = Precompiles.JSON_GET_FLOAT_AS_INT.staticcall(encodedParams);
        
        if (success && returnData.length > 0) {
            avgHr = abi.decode(returnData, (int256));
        }
        
        return (
            proof(),
            uint256(avgHr >= int256(0) ? avgHr : int256(0)), // Ensure non-negative
            account
        );
    }

    function getDailySteps(
        WebProof calldata webProof, 
        address account,
        string calldata userDisplayName,
        string calldata calendarDate
    )
        public
        view
        returns (Proof memory, uint256, address)
    {
        string memory fullUrl = string(abi.encodePacked(
            USER_SUMMARY_BASE_URL,
            userDisplayName,
            "?calendarDate=",
            calendarDate
        ));

        Web memory web = webProof.verify(fullUrl);
        
        // Get total steps
        int256 steps = web.jsonGetInt("totalSteps");
        uint256 totalSteps = uint256(steps >= int256(0) ? steps : int256(0));
        
        return (proof(), totalSteps, account);
    }

    function getDailyAverageStress(
        WebProof calldata webProof, 
        address account,
        string calldata userDisplayName,
        string calldata calendarDate
    )
        public
        view
        returns (Proof memory, uint256, address)
    {
        string memory fullUrl = string(abi.encodePacked(
            USER_SUMMARY_BASE_URL,
            userDisplayName,
            "?calendarDate=",
            calendarDate
        ));

        Web memory web = webProof.verify(fullUrl);
        
        // Get average stress level
        int256 stress = web.jsonGetInt("averageStressLevel");
        uint256 averageStressLevel = uint256(stress >= int256(0) ? stress : int256(0));
        
        return (proof(), averageStressLevel, account);
    }

    function getDailyDistance(
        WebProof calldata webProof, 
        address account,
        string calldata userDisplayName,
        string calldata calendarDate
    )
        public
        view
        returns (Proof memory, uint256, address)
    {
        string memory fullUrl = string(abi.encodePacked(
            USER_SUMMARY_BASE_URL,
            userDisplayName,
            "?calendarDate=",
            calendarDate
        ));

        Web memory web = webProof.verify(fullUrl);
        
        // Get total distance in meters
        int256 distance = web.jsonGetInt("totalDistanceMeters");
        uint256 totalDistanceMeters = uint256(distance >= int256(0) ? distance : int256(0));
        
        return (proof(), totalDistanceMeters, account);
    }

    function getDailyRestingHeartRate(
        WebProof calldata webProof, 
        address account,
        string calldata userDisplayName,
        string calldata calendarDate
    )
        public
        view
        returns (Proof memory, uint256, address)
    {
        string memory fullUrl = string(abi.encodePacked(
            USER_SUMMARY_BASE_URL,
            userDisplayName,
            "?calendarDate=",
            calendarDate
        ));

        Web memory web = webProof.verify(fullUrl);
        
        // Get resting heart rate
        int256 hr = web.jsonGetInt("restingHeartRate");
        uint256 restingHeartRate = uint256(hr >= int256(0) ? hr : int256(0));
        
        return (proof(), restingHeartRate, account);
    }
} 