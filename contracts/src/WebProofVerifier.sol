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
    
    // Enum para el estado de las apuestas
    enum BetStatus {
        Active,      // Apuesta activa, aún se puede apostar
        Closed,      // Apuesta cerrada, no se puede apostar más
        Resolved     // Apuesta resuelta, se pueden reclamar ganancias
    }
    
    // Struct para las apuestas de pasos diarios
    struct StepsBet {
        uint256 betId;                    // ID único de la apuesta
        address creator;                  // Usuario que creó la apuesta
        string targetDate;                // Fecha objetivo (YYYY-MM-DD)
        uint256 minimumSteps;             // Mínimo de pasos para ganar
        uint256 totalPoolFor;             // Total apostado a favor
        uint256 totalPoolAgainst;         // Total apostado en contra
        BetStatus status;                 // Estado de la apuesta
        bool goalAchieved;                // Si se logró el objetivo (solo válido cuando status == Resolved)
        uint256 actualSteps;              // Pasos reales del día (solo válido cuando status == Resolved)
        uint256 createdAt;                // Timestamp de creación
        uint256 closedAt;                 // Timestamp de cierre (cuando ya no se puede apostar)
        uint256 resolvedAt;               // Timestamp de resolución
    }
    
    // Struct para las apuestas individuales de los usuarios
    struct UserBet {
        uint256 betId;                    // ID de la apuesta
        address bettor;                   // Usuario que apostó
        uint256 amount;                   // Cantidad apostada
        bool bettingFor;                  // true = a favor, false = en contra
        bool claimed;                     // Si ya reclamó las ganancias
    }
    
    // Struct para las comunidades
    struct Community {
        uint256 communityId;              // ID único de la comunidad
        string title;                     // Título de la comunidad
        address creator;                  // Usuario que creó la comunidad
        uint256 minActivitiesRequired;    // Mínimo de actividades requeridas para unirse
        uint256 memberCount;              // Número de miembros
        uint256 createdAt;                // Timestamp de creación
    }
    
    // Mapping de address a datos de fitness
    mapping(address => UserFitnessData) public userFitnessData;
    
    // Mapping de address a datos de resumen diario por fecha
    // address => (calendarDate => DailySummaryData)
    mapping(address => mapping(string => DailySummaryData)) public userDailySummaryData;
    
    // Mapping para trackear qué fechas tiene cada usuario
    mapping(address => string[]) public userDates;
    
    // Mappings para las apuestas
    mapping(uint256 => StepsBet) public stepsBets;           // betId => StepsBet
    mapping(uint256 => UserBet[]) public betParticipants;    // betId => array de UserBet
    mapping(address => uint256[]) public userBetIds;         // user => array de betIds donde participó
    
    uint256 public nextBetId = 1;                            // Contador para IDs de apuestas
    uint256[] public activeBetIds;                           // Array de IDs de apuestas activas
    
    // Mappings para las comunidades
    mapping(uint256 => Community) public communities;                    // communityId => Community
    mapping(uint256 => address[]) public communityMembers;              // communityId => array de miembros
    mapping(address => uint256[]) public userCommunities;               // user => array de communityIds
    mapping(uint256 => mapping(address => bool)) public isMember;       // communityId => user => bool
    
    uint256 public nextCommunityId = 1;                      // Contador para IDs de comunidades
    uint256[] public allCommunityIds;                        // Array de todos los IDs de comunidades
    
    // Events para las apuestas
    event StepsBetCreated(uint256 indexed betId, address indexed creator, string targetDate, uint256 minimumSteps);
    event BetPlaced(uint256 indexed betId, address indexed bettor, uint256 amount, bool bettingFor);
    event BetClosed(uint256 indexed betId);
    event BetResolved(uint256 indexed betId, bool goalAchieved, uint256 actualSteps);
    event WinningsClaimed(uint256 indexed betId, address indexed winner, uint256 amount);
    
    // Events para las comunidades
    event CommunityCreated(uint256 indexed communityId, address indexed creator, string title, uint256 minActivitiesRequired);
    event UserJoinedCommunity(uint256 indexed communityId, address indexed user);
    event UserLeftCommunity(uint256 indexed communityId, address indexed user);

    constructor(address _prover) {
        prover = _prover;
    }

    function verify(Proof calldata, string memory username, address account)
        public
        onlyVerified(prover, WebProofProver.main.selector)
    {
        require(bytes(addressToUsername[account]).length == 0, "Address already has a username");
        addressToUsername[account] = username;
        
        // Initialize user fitness data
        userFitnessData[account].userAddress = account;
        userFitnessData[account].username = username;
    }

    function verifyCountOfActivities(
        Proof calldata,
        uint256 countOfActivities,
        address account
    )
        public
        onlyVerified(prover, WebProofProver.getCountOfActivities.selector)
    {
        require(bytes(addressToUsername[account]).length != 0, "User must be registered first");
        userFitnessData[account].countOfActivities = countOfActivities;
        userFitnessData[account].lastUpdated = block.timestamp;
    }

    function verifyTotalDistance(
        Proof calldata,
        uint256 totalDistance,
        address account
    )
        public
        onlyVerified(prover, WebProofProver.getTotalDistance.selector)
    {
        require(bytes(addressToUsername[account]).length != 0, "User must be registered first");
        userFitnessData[account].totalDistance = totalDistance;
        userFitnessData[account].lastUpdated = block.timestamp;
    }

    function verifyTotalCalories(
        Proof calldata,
        uint256 totalCalories,
        address account
    )
        public
        onlyVerified(prover, WebProofProver.getTotalCalories.selector)
    {
        require(bytes(addressToUsername[account]).length != 0, "User must be registered first");
        userFitnessData[account].totalCalories = totalCalories;
        userFitnessData[account].lastUpdated = block.timestamp;
    }

    function verifyAvgHeartRate(
        Proof calldata,
        uint256 avgHeartRate,
        address account
    )
        public
        onlyVerified(prover, WebProofProver.getAvgHeartRate.selector)
    {
        require(bytes(addressToUsername[account]).length != 0, "User must be registered first");
        userFitnessData[account].avgHeartRate = avgHeartRate;
        userFitnessData[account].lastUpdated = block.timestamp;
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
        require(bytes(addressToUsername[account]).length != 0, "User must be registered first");
        
        // Check if this is a new date for this user
        bool isNewDate = userDailySummaryData[account][calendarDate].lastUpdated == 0;
        
        // Initialize or update the daily summary data
        if (isNewDate) {
            userDailySummaryData[account][calendarDate] = DailySummaryData({
                totalSteps: totalSteps,
                averageStressLevel: 0,
                totalDistanceMeters: 0,
                restingHeartRate: 0,
                calendarDate: calendarDate,
                lastUpdated: block.timestamp
            });
            userDates[account].push(calendarDate);
        } else {
            userDailySummaryData[account][calendarDate].totalSteps = totalSteps;
            userDailySummaryData[account][calendarDate].lastUpdated = block.timestamp;
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
        require(bytes(addressToUsername[account]).length != 0, "User must be registered first");
        
        // Check if this is a new date for this user
        bool isNewDate = userDailySummaryData[account][calendarDate].lastUpdated == 0;
        
        // Initialize or update the daily summary data
        if (isNewDate) {
            userDailySummaryData[account][calendarDate] = DailySummaryData({
                totalSteps: 0,
                averageStressLevel: averageStressLevel,
                totalDistanceMeters: 0,
                restingHeartRate: 0,
                calendarDate: calendarDate,
                lastUpdated: block.timestamp
            });
            userDates[account].push(calendarDate);
        } else {
            userDailySummaryData[account][calendarDate].averageStressLevel = averageStressLevel;
            userDailySummaryData[account][calendarDate].lastUpdated = block.timestamp;
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
        require(bytes(addressToUsername[account]).length != 0, "User must be registered first");
        
        // Check if this is a new date for this user
        bool isNewDate = userDailySummaryData[account][calendarDate].lastUpdated == 0;
        
        // Initialize or update the daily summary data
        if (isNewDate) {
            userDailySummaryData[account][calendarDate] = DailySummaryData({
                totalSteps: 0,
                averageStressLevel: 0,
                totalDistanceMeters: totalDistanceMeters,
                restingHeartRate: 0,
                calendarDate: calendarDate,
                lastUpdated: block.timestamp
            });
            userDates[account].push(calendarDate);
        } else {
            userDailySummaryData[account][calendarDate].totalDistanceMeters = totalDistanceMeters;
            userDailySummaryData[account][calendarDate].lastUpdated = block.timestamp;
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
        require(bytes(addressToUsername[account]).length != 0, "User must be registered first");
        
        // Check if this is a new date for this user
        bool isNewDate = userDailySummaryData[account][calendarDate].lastUpdated == 0;
        
        // Initialize or update the daily summary data
        if (isNewDate) {
            userDailySummaryData[account][calendarDate] = DailySummaryData({
                totalSteps: 0,
                averageStressLevel: 0,
                totalDistanceMeters: 0,
                restingHeartRate: restingHeartRate,
                calendarDate: calendarDate,
                lastUpdated: block.timestamp
            });
            userDates[account].push(calendarDate);
        } else {
            userDailySummaryData[account][calendarDate].restingHeartRate = restingHeartRate;
            userDailySummaryData[account][calendarDate].lastUpdated = block.timestamp;
        }
    }

    // ========== FUNCIONES DE APUESTAS ==========
    
    /**
     * @dev Crea una nueva apuesta de pasos diarios
     * @param targetDate Fecha objetivo en formato YYYY-MM-DD
     * @param minimumSteps Mínimo de pasos para ganar la apuesta
     */
    function createStepsBet(
        string calldata targetDate,
        uint256 minimumSteps
    ) external payable {
        require(bytes(addressToUsername[msg.sender]).length != 0, "User must be registered first");
        require(minimumSteps > 0, "Minimum steps must be greater than 0");
        require(msg.value > 0, "Must send ETH to create bet");
        
        // Verificar que la fecha sea futura (simplificado, asumimos formato correcto)
        // En una implementación real, se debería validar el formato de fecha
        
        uint256 betId = nextBetId++;
        
        stepsBets[betId] = StepsBet({
            betId: betId,
            creator: msg.sender,
            targetDate: targetDate,
            minimumSteps: minimumSteps,
            totalPoolFor: msg.value,
            totalPoolAgainst: 0,
            status: BetStatus.Active,
            goalAchieved: false,
            actualSteps: 0,
            createdAt: block.timestamp,
            closedAt: 0,
            resolvedAt: 0
        });
        
        // El creador apuesta a favor por defecto
        betParticipants[betId].push(UserBet({
            betId: betId,
            bettor: msg.sender,
            amount: msg.value,
            bettingFor: true,
            claimed: false
        }));
        
        userBetIds[msg.sender].push(betId);
        activeBetIds.push(betId);
        
        emit StepsBetCreated(betId, msg.sender, targetDate, minimumSteps);
        emit BetPlaced(betId, msg.sender, msg.value, true);
    }
    
    /**
     * @dev Permite a los usuarios apostar a favor o en contra de una apuesta existente
     * @param betId ID de la apuesta
     * @param bettingFor true para apostar a favor, false para apostar en contra
     */
    function placeBet(uint256 betId, bool bettingFor) external payable {
        require(msg.value > 0, "Must send ETH to place bet");
        require(stepsBets[betId].status == BetStatus.Active, "Bet is not active");
        require(stepsBets[betId].creator != address(0), "Bet does not exist");
        
        // Actualizar el pool correspondiente
        if (bettingFor) {
            stepsBets[betId].totalPoolFor += msg.value;
        } else {
            stepsBets[betId].totalPoolAgainst += msg.value;
        }
        
        // Registrar la apuesta del usuario
        betParticipants[betId].push(UserBet({
            betId: betId,
            bettor: msg.sender,
            amount: msg.value,
            bettingFor: bettingFor,
            claimed: false
        }));
        
        userBetIds[msg.sender].push(betId);
        
        emit BetPlaced(betId, msg.sender, msg.value, bettingFor);
    }
    
    /**
     * @dev Cierra una apuesta para que no se puedan hacer más apuestas
     * @param betId ID de la apuesta
     */
    function closeBet(uint256 betId) external {
        require(stepsBets[betId].creator == msg.sender, "Only creator can close bet");
        require(stepsBets[betId].status == BetStatus.Active, "Bet is not active");
        
        stepsBets[betId].status = BetStatus.Closed;
        stepsBets[betId].closedAt = block.timestamp;
        
        // Remover de apuestas activas
        _removeFromActiveBets(betId);
        
        emit BetClosed(betId);
    }
    
    /**
     * @dev Resuelve una apuesta usando los datos verificados de pasos diarios
     * @param betId ID de la apuesta
     */
    function resolveBet(uint256 betId) external {
        StepsBet storage bet = stepsBets[betId];
        require(bet.creator != address(0), "Bet does not exist");
        require(bet.status == BetStatus.Closed, "Bet must be closed first");
        
        // Verificar que existan datos para la fecha objetivo
        DailySummaryData memory dailyData = userDailySummaryData[bet.creator][bet.targetDate];
        require(dailyData.lastUpdated != 0, "No verified data for target date");
        
        // Determinar si se logró el objetivo
        bool goalAchieved = dailyData.totalSteps >= bet.minimumSteps;
        
        bet.status = BetStatus.Resolved;
        bet.goalAchieved = goalAchieved;
        bet.actualSteps = dailyData.totalSteps;
        bet.resolvedAt = block.timestamp;
        
        emit BetResolved(betId, goalAchieved, dailyData.totalSteps);
    }
    
    /**
     * @dev Permite a los ganadores reclamar sus ganancias
     * @param betId ID de la apuesta
     */
    function claimWinnings(uint256 betId) external {
        require(stepsBets[betId].status == BetStatus.Resolved, "Bet not resolved yet");
        
        UserBet[] storage participants = betParticipants[betId];
        StepsBet memory bet = stepsBets[betId];
        
        uint256 userWinnings = 0;
        bool userParticipated = false;
        
        // Calcular las ganancias del usuario
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].bettor == msg.sender && !participants[i].claimed) {
                userParticipated = true;
                
                // Verificar si el usuario ganó
                bool userWon = (participants[i].bettingFor && bet.goalAchieved) || 
                              (!participants[i].bettingFor && !bet.goalAchieved);
                
                if (userWon) {
                    uint256 winningPool = bet.goalAchieved ? bet.totalPoolFor : bet.totalPoolAgainst;
                    uint256 losingPool = bet.goalAchieved ? bet.totalPoolAgainst : bet.totalPoolFor;
                    
                    // Calcular proporción de ganancias
                    if (winningPool > 0) {
                        uint256 userShare = (participants[i].amount * losingPool) / winningPool;
                        userWinnings += participants[i].amount + userShare;
                    }
                }
                
                participants[i].claimed = true;
            }
        }
        
        require(userParticipated, "User did not participate in this bet");
        
        if (userWinnings > 0) {
            payable(msg.sender).transfer(userWinnings);
            emit WinningsClaimed(betId, msg.sender, userWinnings);
        }
    }
    
    // ========== FUNCIONES DE COMUNIDADES ==========
    
    /**
     * @dev Crea una nueva comunidad
     * @param title Título de la comunidad
     * @param minActivitiesRequired Mínimo de actividades requeridas para unirse
     */
    function createCommunity(
        string calldata title,
        uint256 minActivitiesRequired
    ) external {
        require(bytes(addressToUsername[msg.sender]).length != 0, "User must be registered first");
        require(bytes(title).length > 0, "Title cannot be empty");
        
        uint256 communityId = nextCommunityId++;
        
        communities[communityId] = Community({
            communityId: communityId,
            title: title,
            creator: msg.sender,
            minActivitiesRequired: minActivitiesRequired,
            memberCount: 1,
            createdAt: block.timestamp
        });
        
        // El creador se une automáticamente a la comunidad
        communityMembers[communityId].push(msg.sender);
        userCommunities[msg.sender].push(communityId);
        isMember[communityId][msg.sender] = true;
        allCommunityIds.push(communityId);
        
        emit CommunityCreated(communityId, msg.sender, title, minActivitiesRequired);
        emit UserJoinedCommunity(communityId, msg.sender);
    }
    
    /**
     * @dev Permite a un usuario unirse a una comunidad
     * @param communityId ID de la comunidad
     */
    function joinCommunity(uint256 communityId) external {
        require(bytes(addressToUsername[msg.sender]).length != 0, "User must be registered first");
        require(communities[communityId].creator != address(0), "Community does not exist");
        require(!isMember[communityId][msg.sender], "User is already a member");
        
        // Verificar que el usuario cumple con el requisito de actividades
        uint256 userActivities = userFitnessData[msg.sender].countOfActivities;
        require(userActivities >= communities[communityId].minActivitiesRequired, 
                "User does not meet minimum activities requirement");
        
        // Agregar usuario a la comunidad
        communityMembers[communityId].push(msg.sender);
        userCommunities[msg.sender].push(communityId);
        isMember[communityId][msg.sender] = true;
        communities[communityId].memberCount++;
        
        emit UserJoinedCommunity(communityId, msg.sender);
    }
    
    /**
     * @dev Permite a un usuario salir de una comunidad
     * @param communityId ID de la comunidad
     */
    function leaveCommunity(uint256 communityId) external {
        require(isMember[communityId][msg.sender], "User is not a member of this community");
        
        // Remover usuario de la comunidad
        _removeUserFromCommunity(communityId, msg.sender);
        _removeCommunityFromUser(msg.sender, communityId);
        isMember[communityId][msg.sender] = false;
        communities[communityId].memberCount--;
        
        emit UserLeftCommunity(communityId, msg.sender);
    }
    
    // ========== FUNCIONES DE CONSULTA ==========
    
    function getUsername(address account) public view returns (string memory) {
        return addressToUsername[account];
    }
    
    function getUserFitnessData(address account) public view returns (UserFitnessData memory) {
        require(bytes(addressToUsername[account]).length != 0, "User not registered");
        return userFitnessData[account];
    }
    
    function getDailySummaryData(address account, string memory calendarDate) public view returns (DailySummaryData memory) {
        require(userDailySummaryData[account][calendarDate].lastUpdated != 0, "Daily summary data not found");
        return userDailySummaryData[account][calendarDate];
    }
    
    function getUserDates(address account) public view returns (string[] memory) {
        return userDates[account];
    }
    
    function getAllDailySummariesByUser(address account) public view returns (DailySummaryData[] memory) {
        string[] memory dates = userDates[account];
        DailySummaryData[] memory summaries = new DailySummaryData[](dates.length);
        
        for (uint256 i = 0; i < dates.length; i++) {
            summaries[i] = userDailySummaryData[account][dates[i]];
        }
        
        return summaries;
    }
    
    /**
     * @dev Obtiene información de una apuesta específica
     */
    function getBet(uint256 betId) public view returns (StepsBet memory) {
        return stepsBets[betId];
    }
    
    /**
     * @dev Obtiene todos los participantes de una apuesta
     */
    function getBetParticipants(uint256 betId) public view returns (UserBet[] memory) {
        return betParticipants[betId];
    }
    
    /**
     * @dev Obtiene todas las apuestas en las que participó un usuario
     */
    function getUserBets(address user) public view returns (uint256[] memory) {
        return userBetIds[user];
    }
    
    /**
     * @dev Obtiene todas las apuestas activas
     */
    function getActiveBets() public view returns (uint256[] memory) {
        return activeBetIds;
    }
    
    /**
     * @dev Obtiene todas las apuestas existentes
     */
    function getAllBets() public view returns (uint256[] memory) {
        uint256[] memory allBets = new uint256[](nextBetId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextBetId; i++) {
            if (stepsBets[i].creator != address(0)) {
                allBets[count] = i;
                count++;
            }
        }
        
        // Crear array del tamaño correcto
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allBets[i];
        }
        
        return result;
    }
    
    /**
     * @dev Calcula las ganancias potenciales de un usuario en una apuesta
     */
    function calculatePotentialWinnings(uint256 betId, address user) public view returns (uint256) {
        if (stepsBets[betId].status != BetStatus.Resolved) {
            return 0;
        }
        
        UserBet[] memory participants = betParticipants[betId];
        StepsBet memory bet = stepsBets[betId];
        uint256 totalWinnings = 0;
        
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].bettor == user && !participants[i].claimed) {
                bool userWon = (participants[i].bettingFor && bet.goalAchieved) || 
                              (!participants[i].bettingFor && !bet.goalAchieved);
                
                if (userWon) {
                    uint256 winningPool = bet.goalAchieved ? bet.totalPoolFor : bet.totalPoolAgainst;
                    uint256 losingPool = bet.goalAchieved ? bet.totalPoolAgainst : bet.totalPoolFor;
                    
                    if (winningPool > 0) {
                        uint256 userShare = (participants[i].amount * losingPool) / winningPool;
                        totalWinnings += participants[i].amount + userShare;
                    }
                }
            }
        }
        
        return totalWinnings;
    }
    
    /**
     * @dev Obtiene información de una comunidad específica
     */
    function getCommunity(uint256 communityId) public view returns (Community memory) {
        require(communities[communityId].creator != address(0), "Community does not exist");
        return communities[communityId];
    }
    
    /**
     * @dev Obtiene todos los miembros de una comunidad
     */
    function getCommunityMembers(uint256 communityId) public view returns (address[] memory) {
        return communityMembers[communityId];
    }
    
    /**
     * @dev Obtiene todas las comunidades de un usuario
     */
    function getUserCommunities(address user) public view returns (uint256[] memory) {
        return userCommunities[user];
    }
    
    /**
     * @dev Obtiene todas las comunidades existentes
     */
    function getAllCommunities() public view returns (uint256[] memory) {
        return allCommunityIds;
    }
    
    /**
     * @dev Verifica si un usuario puede unirse a una comunidad
     */
    function canJoinCommunity(address user, uint256 communityId) public view returns (bool) {
        if (communities[communityId].creator == address(0)) {
            return false; // Comunidad no existe
        }
        
        if (isMember[communityId][user]) {
            return false; // Ya es miembro
        }
        
        if (bytes(addressToUsername[user]).length == 0) {
            return false; // Usuario no registrado
        }
        
        uint256 userActivities = userFitnessData[user].countOfActivities;
        return userActivities >= communities[communityId].minActivitiesRequired;
    }
    
    /**
     * @dev Obtiene las comunidades que un usuario puede unirse
     */
    function getJoinableCommunities(address user) public view returns (uint256[] memory) {
        uint256[] memory joinable = new uint256[](allCommunityIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allCommunityIds.length; i++) {
            if (canJoinCommunity(user, allCommunityIds[i])) {
                joinable[count] = allCommunityIds[i];
                count++;
            }
        }
        
        // Crear array del tamaño correcto
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = joinable[i];
        }
        
        return result;
    }
    
    // ========== FUNCIONES INTERNAS ==========
    
    /**
     * @dev Remueve una apuesta del array de apuestas activas
     */
    function _removeFromActiveBets(uint256 betId) internal {
        for (uint256 i = 0; i < activeBetIds.length; i++) {
            if (activeBetIds[i] == betId) {
                activeBetIds[i] = activeBetIds[activeBetIds.length - 1];
                activeBetIds.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Remueve un usuario del array de miembros de una comunidad
     */
    function _removeUserFromCommunity(uint256 communityId, address user) internal {
        address[] storage members = communityMembers[communityId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == user) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Remueve una comunidad del array de comunidades de un usuario
     */
    function _removeCommunityFromUser(address user, uint256 communityId) internal {
        uint256[] storage userComms = userCommunities[user];
        for (uint256 i = 0; i < userComms.length; i++) {
            if (userComms[i] == communityId) {
                userComms[i] = userComms[userComms.length - 1];
                userComms.pop();
                break;
            }
        }
    }
} 