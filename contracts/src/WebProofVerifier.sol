// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {WebProofProver} from "./WebProofProver.sol";

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";

contract WebProofVerifier is Verifier {
    address public prover;
    mapping(address => string) public addressToUsername;
    
    // Struct para almacenar datos de fitness del usuario
    // NOTA: Los valores decimales están preservados usando JSON_GET_FLOAT_AS_INT con precisión 3
    // Por ejemplo: 146.293 se almacena como 146293 (multiplicado por 1000)
    struct UserFitnessData {
        uint256 userId;
        address userAddress;
        string username;
        uint256 countOfActivities;        // número entero de actividades
        uint256 totalDistance;            // en metros * 1000 (precisión 3)
        uint256 totalCalories;            // calorías * 1000 (precisión 3)
        uint256 avgHeartRate;             // bpm promedio * 1000 (precisión 3)
        uint256 lastUpdated;              // timestamp de última actualización
    }
    
    // Struct para almacenar datos de resumen diario
    struct DailySummaryData {
        uint256 totalSteps;               // pasos totales del día
        uint256 averageStressLevel;       // nivel promedio de estrés
        uint256 totalDistanceMeters;      // distancia total en metros
        uint256 restingHeartRate;         // frecuencia cardíaca en reposo
        string calendarDate;              // fecha del resumen (YYYY-MM-DD)
        uint256 lastUpdated;              // timestamp de última actualización
    }
    
    // Mapping de userId a datos de fitness
    mapping(uint256 => UserFitnessData) public userFitnessData;
    
    // Mapping de address a userId para facilitar búsquedas
    mapping(address => uint256) public addressToUserId;
    
    // Mapping de userId a datos de resumen diario por fecha
    // userId => (calendarDate => DailySummaryData)
    mapping(uint256 => mapping(string => DailySummaryData)) public userDailySummaryData;
    
    // Mapping para trackear qué fechas tiene cada usuario
    mapping(uint256 => string[]) public userDates;
    
    // Contador para generar userIds únicos
    uint256 public nextUserId = 1;

    constructor(address _prover) {
        prover = _prover;
    }

    function verify(Proof calldata, string memory username, address account)
        public
        onlyVerified(prover, WebProofProver.main.selector)
    {
        require(bytes(addressToUsername[account]).length == 0, "Address already has a username");
        addressToUsername[account] = username;
        
        // Asignar userId si no existe
        if (addressToUserId[account] == 0) {
            addressToUserId[account] = nextUserId;
            userFitnessData[nextUserId].userId = nextUserId;
            userFitnessData[nextUserId].userAddress = account;
            userFitnessData[nextUserId].username = username;
            nextUserId++;
        }
    }

    function verifyCountOfActivities(
        Proof calldata,
        uint256 countOfActivities,
        address account
    )
        public
        onlyVerified(prover, WebProofProver.getCountOfActivities.selector)
    {
        require(addressToUserId[account] != 0, "User must be registered first");
        uint256 userId = addressToUserId[account];
        userFitnessData[userId].countOfActivities = countOfActivities;
        userFitnessData[userId].lastUpdated = block.timestamp;
    }

    function verifyTotalDistance(
        Proof calldata,
        uint256 totalDistance,
        address account
    )
        public
        onlyVerified(prover, WebProofProver.getTotalDistance.selector)
    {
        require(addressToUserId[account] != 0, "User must be registered first");
        uint256 userId = addressToUserId[account];
        userFitnessData[userId].totalDistance = totalDistance;
        userFitnessData[userId].lastUpdated = block.timestamp;
    }

    function verifyTotalCalories(
        Proof calldata,
        uint256 totalCalories,
        address account
    )
        public
        onlyVerified(prover, WebProofProver.getTotalCalories.selector)
    {
        require(addressToUserId[account] != 0, "User must be registered first");
        uint256 userId = addressToUserId[account];
        userFitnessData[userId].totalCalories = totalCalories;
        userFitnessData[userId].lastUpdated = block.timestamp;
    }

    function verifyAvgHeartRate(
        Proof calldata,
        uint256 avgHeartRate,
        address account
    )
        public
        onlyVerified(prover, WebProofProver.getAvgHeartRate.selector)
    {
        require(addressToUserId[account] != 0, "User must be registered first");
        uint256 userId = addressToUserId[account];
        userFitnessData[userId].avgHeartRate = avgHeartRate;
        userFitnessData[userId].lastUpdated = block.timestamp;
    }

    function verifyDailySteps(
        Proof calldata,
        uint256 totalSteps,
        address account,
        string calldata calendarDate
    )
        public
        onlyVerified(prover, WebProofProver.getDailySteps.selector)
    {
        require(addressToUserId[account] != 0, "User must be registered first");
        uint256 userId = addressToUserId[account];
        
        // Check if this is a new date for this user
        bool isNewDate = userDailySummaryData[userId][calendarDate].lastUpdated == 0;
        
        // Initialize or update the daily summary data
        if (isNewDate) {
            userDailySummaryData[userId][calendarDate] = DailySummaryData({
                totalSteps: totalSteps,
                averageStressLevel: 0,
                totalDistanceMeters: 0,
                restingHeartRate: 0,
                calendarDate: calendarDate,
                lastUpdated: block.timestamp
            });
            userDates[userId].push(calendarDate);
        } else {
            userDailySummaryData[userId][calendarDate].totalSteps = totalSteps;
            userDailySummaryData[userId][calendarDate].lastUpdated = block.timestamp;
        }
    }

    function verifyDailyAverageStress(
        Proof calldata,
        uint256 averageStressLevel,
        address account,
        string calldata calendarDate
    )
        public
        onlyVerified(prover, WebProofProver.getDailyAverageStress.selector)
    {
        require(addressToUserId[account] != 0, "User must be registered first");
        uint256 userId = addressToUserId[account];
        
        // Check if this is a new date for this user
        bool isNewDate = userDailySummaryData[userId][calendarDate].lastUpdated == 0;
        
        // Initialize or update the daily summary data
        if (isNewDate) {
            userDailySummaryData[userId][calendarDate] = DailySummaryData({
                totalSteps: 0,
                averageStressLevel: averageStressLevel,
                totalDistanceMeters: 0,
                restingHeartRate: 0,
                calendarDate: calendarDate,
                lastUpdated: block.timestamp
            });
            userDates[userId].push(calendarDate);
        } else {
            userDailySummaryData[userId][calendarDate].averageStressLevel = averageStressLevel;
            userDailySummaryData[userId][calendarDate].lastUpdated = block.timestamp;
        }
    }

    function verifyDailyDistance(
        Proof calldata,
        uint256 totalDistanceMeters,
        address account,
        string calldata calendarDate
    )
        public
        onlyVerified(prover, WebProofProver.getDailyDistance.selector)
    {
        require(addressToUserId[account] != 0, "User must be registered first");
        uint256 userId = addressToUserId[account];
        
        // Check if this is a new date for this user
        bool isNewDate = userDailySummaryData[userId][calendarDate].lastUpdated == 0;
        
        // Initialize or update the daily summary data
        if (isNewDate) {
            userDailySummaryData[userId][calendarDate] = DailySummaryData({
                totalSteps: 0,
                averageStressLevel: 0,
                totalDistanceMeters: totalDistanceMeters,
                restingHeartRate: 0,
                calendarDate: calendarDate,
                lastUpdated: block.timestamp
            });
            userDates[userId].push(calendarDate);
        } else {
            userDailySummaryData[userId][calendarDate].totalDistanceMeters = totalDistanceMeters;
            userDailySummaryData[userId][calendarDate].lastUpdated = block.timestamp;
        }
    }

    function verifyDailyRestingHeartRate(
        Proof calldata,
        uint256 restingHeartRate,
        address account,
        string calldata calendarDate
    )
        public
        onlyVerified(prover, WebProofProver.getDailyRestingHeartRate.selector)
    {
        require(addressToUserId[account] != 0, "User must be registered first");
        uint256 userId = addressToUserId[account];
        
        // Check if this is a new date for this user
        bool isNewDate = userDailySummaryData[userId][calendarDate].lastUpdated == 0;
        
        // Initialize or update the daily summary data
        if (isNewDate) {
            userDailySummaryData[userId][calendarDate] = DailySummaryData({
                totalSteps: 0,
                averageStressLevel: 0,
                totalDistanceMeters: 0,
                restingHeartRate: restingHeartRate,
                calendarDate: calendarDate,
                lastUpdated: block.timestamp
            });
            userDates[userId].push(calendarDate);
        } else {
            userDailySummaryData[userId][calendarDate].restingHeartRate = restingHeartRate;
            userDailySummaryData[userId][calendarDate].lastUpdated = block.timestamp;
        }
    }

    function getUsername(address account) public view returns (string memory) {
        return addressToUsername[account];
    }
    
    function getUserFitnessData(uint256 userId) public view returns (UserFitnessData memory) {
        require(userFitnessData[userId].userId != 0, "User fitness data not found");
        return userFitnessData[userId];
    }
    
    function getUserFitnessDataByAddress(address account) public view returns (UserFitnessData memory) {
        uint256 userId = addressToUserId[account];
        require(userId != 0, "User not registered");
        return getUserFitnessData(userId);
    }
    
    function getUserId(address account) public view returns (uint256) {
        return addressToUserId[account];
    }
    
    function getDailySummaryData(uint256 userId, string memory calendarDate) public view returns (DailySummaryData memory) {
        require(userDailySummaryData[userId][calendarDate].lastUpdated != 0, "Daily summary data not found");
        return userDailySummaryData[userId][calendarDate];
    }
    
    function getDailySummaryDataByAddress(address account, string memory calendarDate) public view returns (DailySummaryData memory) {
        uint256 userId = addressToUserId[account];
        require(userId != 0, "User not registered");
        return getDailySummaryData(userId, calendarDate);
    }
    
    function getUserDates(uint256 userId) public view returns (string[] memory) {
        return userDates[userId];
    }
    
    function getUserDatesByAddress(address account) public view returns (string[] memory) {
        uint256 userId = addressToUserId[account];
        require(userId != 0, "User not registered");
        return getUserDates(userId);
    }
    
    function getAllDailySummariesByUser(uint256 userId) public view returns (DailySummaryData[] memory) {
        string[] memory dates = userDates[userId];
        DailySummaryData[] memory summaries = new DailySummaryData[](dates.length);
        
        for (uint256 i = 0; i < dates.length; i++) {
            summaries[i] = userDailySummaryData[userId][dates[i]];
        }
        
        return summaries;
    }
    
    function getAllDailySummariesByAddress(address account) public view returns (DailySummaryData[] memory) {
        uint256 userId = addressToUserId[account];
        require(userId != 0, "User not registered");
        return getAllDailySummariesByUser(userId);
    }
} 