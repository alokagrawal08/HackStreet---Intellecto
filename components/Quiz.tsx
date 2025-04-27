import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Progress,
  Container,
  RadioGroup,
  Radio,
  Alert,
  AlertIcon,
  useToast,
  HStack,
  Flex,
  useColorModeValue,
  Badge,
  Grid,
  useColorMode,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Icon,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { ThemeToggle } from './ThemeToggle';
import { WarningIcon } from '@chakra-ui/icons';

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  role: {
    id: number;
    name: string;
  };
}

interface Answer {
  questionId: number;
  selectedOption: string;
  isCorrect: boolean;
  question: string; // Store question text for review
}

interface DisqualificationData {
  reason: string;
  timestamp: string;
  warningCount: number;
}

const TOTAL_TIME = 2 * 60; // 2 minutes in seconds
const MAX_QUESTIONS = 5;
const PASSING_PERCENTAGE = 0;
const MAX_WARNINGS = 3;

const Quiz: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const toast = useToast();
  const router = useRouter();
  const { colorMode } = useColorMode();
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const [warningCount, setWarningCount] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isDisqualificationSaved, setIsDisqualificationSaved] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [warningTimeout, setWarningTimeout] = useState<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Timer functionality
  useEffect(() => {
    if (timeLeft > 0 && !showResult && !showReview) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      handleTimeUp();
    }
  }, [timeLeft, showResult, showReview]);

  const handleTimeUp = () => {
    toast({
      title: 'Time\'s up!',
      description: 'Your quiz will be submitted automatically.',
      status: 'warning',
      duration: 3000,
      isClosable: true,
    });
    setShowReview(true);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fetch and randomize questions
  const fetchQuestions = async () => {
    try {
      const response = await fetch('https://jm-ebg-cdp.el.r.appspot.com/api/questions?role=FullStack%20(Web)');
      const data = await response.json();
      
      // Randomly select 15 questions
      const shuffled = data.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, MAX_QUESTIONS);
      
      setQuestions(selectedQuestions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to fetch questions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleOptionSelect = (option: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = currentQuestion.correctOption === option;
    
    const newAnswer = {
      questionId: currentQuestion.id,
      selectedOption: option,
      isCorrect,
      question: currentQuestion.question
    };
    
    const existingAnswerIndex = answers.findIndex(a => a.questionId === currentQuestion.id);
    
    if (existingAnswerIndex !== -1) {
      const newAnswers = [...answers];
      newAnswers[existingAnswerIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, newAnswer]);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowReview(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    const correctAnswers = answers.filter(answer => answer.isCorrect).length;
    return (correctAnswers / questions.length) * 100;
  };

  // Handle document clicks for fullscreen
  useEffect(() => {
    const handleClick = () => {
      if (!document.fullscreenElement && !loading && !showResult) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [loading, showResult]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && !loading && !showResult) {
        handleWarning('Exiting fullscreen mode is not allowed during the quiz');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [loading, showResult]);

  // Function to show warning banner
  const showWarning = (message: string) => {
    setWarningMessage(message);
    setShowWarningBanner(true);
    
    // Clear existing timeout if any
    if (warningTimeout) {
      clearTimeout(warningTimeout);
    }
    
    // Hide banner after 3 seconds
    const timeout = setTimeout(() => {
      setShowWarningBanner(false);
    }, 3000);
    
    setWarningTimeout(timeout);
  };

  // Update handleWarning to prevent duplicate disqualification
  const handleWarning = async (reason: string) => {
    const newWarningCount = warningCount + 1;
    setWarningCount(newWarningCount);
    showWarning(`Warning ${newWarningCount}/${MAX_WARNINGS}: ${reason}`);

    if (newWarningCount >= MAX_WARNINGS && !isDisqualificationSaved) {
      setIsDisqualified(true);
      setShowResult(true);
      setIsDisqualificationSaved(true);

      try {
        const userName = localStorage.getItem('userName') || 'Anonymous';
        const userId = localStorage.getItem('userId') || 'default-user';

        const disqualificationData = {
          status: 'DISQUALIFIED',
          reason: `Disqualified after ${MAX_WARNINGS} warnings. Last warning: ${reason}`,
          timestamp: new Date().toISOString(),
          warningCount: newWarningCount,
          questions: questions.map(q => ({
            questionId: q.id,
            question: q.question,
            selectedOption: answers.find(a => a.questionId === q.id)?.selectedOption || null,
            isCorrect: false
          }))
        };

        const response = await fetch('/api/save-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            UserName: userName,
            UserID: userId,
            json_data: disqualificationData
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save disqualification data');
        }
      } catch (error) {
        console.error('Error saving disqualification data:', error);
      }
    }
  };

  // Handle tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleWarning('Switching tabs is not allowed during the quiz');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [warningCount]);

  // Disable right-click and keyboard shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleWarning('Right-clicking is not allowed during the quiz');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent inspect element (F12 or Ctrl+Shift+I/J/C)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        e.preventDefault();
        handleWarning('Developer tools are not allowed during the quiz');
      }

      // Prevent copy/paste (Ctrl+C, Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
        e.preventDefault();
        handleWarning('Copy/Paste is not allowed during the quiz');
      }

      // Prevent Alt+Tab
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        handleWarning('Switching windows is not allowed during the quiz');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [warningCount]);

  // Handle first interaction and fullscreen
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        document.documentElement.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [hasInteracted]);

  const handleProceed = () => {
    // Simply redirect to interview platform
    window.location.href = 'https://ai-interview-platform-2whg2og9v-lalit-shrotriyas-projects.vercel.app/';
  };

  const handleSubmit = async () => {
    const score = calculateScore();
    const passed = score >= PASSING_PERCENTAGE;
    
    try {
      // Get user info from localStorage or your auth system
      const userName = localStorage.getItem('userName') || 'Anonymous';
      const userId = localStorage.getItem('userId') || 'default-user';

      // Prepare quiz data
      const quizData = {
        status: passed ? 'PASSED' : 'FAILED',
        score: score.toFixed(1),
        timestamp: new Date().toISOString(),
        questions: questions.map(q => ({
          questionId: q.id,
          question: q.question,
          selectedOption: answers.find(a => a.questionId === q.id)?.selectedOption || null,
          isCorrect: answers.find(a => a.questionId === q.id)?.isCorrect || false
        }))
      };

      // Save quiz data to database
      const response = await fetch('/api/save-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UserName: userName,
          UserID: userId,
          json_data: quizData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save quiz data');
      }

      // Exit fullscreen if enabled
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      toast({
        title: 'Quiz Submitted',
        description: 'Your quiz results have been saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving quiz data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save quiz results',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }

    setShowReview(false);
    setShowResult(true);
  };

  // Improve warning modal to prevent flickering
  const WarningModal = () => (
    <Modal 
      isOpen={showWarningModal} 
      onClose={() => setShowWarningModal(false)} 
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
      motionPreset="slideInBottom"
    >
      <ModalOverlay 
        bg="blackAlpha.600" 
        backdropFilter="blur(10px)"
      />
      <ModalContent
        bg={useColorModeValue('white', 'gray.800')}
        borderRadius="xl"
        boxShadow="2xl"
      >
        <ModalHeader 
          color="red.500"
          borderBottom="1px"
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          pb={4}
        >
          <Flex align="center" gap={2}>
            <Icon as={WarningIcon} w={6} h={6} />
            Warning!
          </Flex>
        </ModalHeader>
        <ModalBody py={6}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg">{warningMessage}</Text>
            <Alert 
              status="error" 
              variant="subtle"
              borderRadius="md"
            >
              <AlertIcon />
              <Text fontWeight="medium">
                Warnings: {warningCount}/{MAX_WARNINGS}
              </Text>
            </Alert>
          </VStack>
        </ModalBody>
        <ModalFooter
          borderTop="1px"
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          pt={4}
        >
          <Button 
            colorScheme="red" 
            onClick={() => setShowWarningModal(false)}
            size="lg"
            width="full"
          >
            I Understand
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  const renderReviewSection = () => {
    return (
      <Box bg={bgColor} p={8} borderRadius="xl" boxShadow="2xl" maxW="900px" mx="auto">
        <VStack spacing={6} align="stretch">
          <Heading size="lg" textAlign="center" mb={4}>
            Review Your Answers
          </Heading>
          
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Q#</Th>
                <Th>Question</Th>
                <Th>Your Answer</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {questions.map((question, index) => {
                const answer = answers.find(a => a.questionId === question.id);
                return (
                  <Tr key={question.id}>
                    <Td>{index + 1}</Td>
                    <Td>{question.question}</Td>
                    <Td>
                      {answer?.selectedOption || 
                        <Badge colorScheme="red">Not answered</Badge>
                      }
                    </Td>
                    <Td>
                      {answer?.isCorrect ? 
                        <Badge colorScheme="green">Correct</Badge> :
                        <Badge colorScheme="red">Incorrect</Badge>
                      }
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>

          <Button
            colorScheme="green"
            size="lg"
            onClick={handleSubmit}
            mt={4}
          >
            Submit Quiz
          </Button>
        </VStack>
      </Box>
    );
  };

  const renderFinalResults = () => {
    const score = isDisqualified ? 0 : calculateScore();
    const passed = !isDisqualified && score >= PASSING_PERCENTAGE;

    return (
      <Box bg={bgColor} p={8} borderRadius="xl" boxShadow="2xl" maxW="600px" mx="auto">
        <VStack spacing={8}>
          <Heading size="xl" bgGradient="linear(to-r, blue.400, purple.500)" 
                  bgClip="text">
            {isDisqualified ? 'Disqualified' : 'Quiz Results'}
          </Heading>
          
          <Box textAlign="center" p={6} borderRadius="lg" 
               bg={useColorModeValue(
                 isDisqualified ? 'red.50' : passed ? 'green.50' : 'red.50',
                 isDisqualified ? 'red.900' : passed ? 'green.900' : 'red.900'
               )} 
               w="100%">
            <Heading size="md" mb={4} color={isDisqualified ? 'red.500' : passed ? 'green.500' : 'red.500'}>
              {isDisqualified 
                ? 'You have been disqualified' 
                : passed ? 'Congratulations! 🎉' : 'Keep Practicing! 💪'}
            </Heading>
            {!isDisqualified && (
              <>
                <Text fontSize="4xl" fontWeight="bold" color={passed ? 'green.600' : 'red.600'}>
                  {answers.filter(a => a.isCorrect).length} / {questions.length}
                </Text>
                <Text fontSize="2xl" color={passed ? 'green.500' : 'red.500'}>
                  {score.toFixed(1)}%
                </Text>
              </>
            )}
          </Box>

          <Alert status={isDisqualified ? "error" : passed ? "success" : "info"} borderRadius="lg">
            <AlertIcon />
            {isDisqualified 
              ? "You have been disqualified for violating quiz rules."
              : passed ? "Great job! You've passed the quiz!" 
              : "Don't worry! Practice makes perfect!"}
          </Alert>

          {passed && !isDisqualified && (
            <Button
              colorScheme="green"
              size="lg"
              onClick={handleProceed}
              w="full"
            >
              Proceed to AI Interview Platform
            </Button>
          )}
        </VStack>
      </Box>
    );
  };

  const renderQuiz = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);

    return (
      <Box 
        bg={bgColor} 
        p={8} 
        borderRadius="xl" 
        boxShadow="2xl"
        border="1px"
        borderColor={borderColor}
      >
        <VStack spacing={6} align="stretch">
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <Heading size="md" bgGradient="linear(to-r, blue.400, purple.500)" bgClip="text">
              Question {currentQuestionIndex + 1} of {questions.length}
            </Heading>
            <Badge
              colorScheme={timeLeft < 60 ? 'red' : 'green'}
              p={2}
              borderRadius="md"
              fontSize="lg"
            >
              Time Left: {formatTime(timeLeft)}
            </Badge>
            <Progress 
              value={((currentQuestionIndex + 1) / questions.length) * 100}
              size="sm"
              width="full"
              colorScheme="purple"
              borderRadius="full"
            />
          </Flex>
          
          <Box p={6} bg={useColorModeValue('gray.50', 'gray.800')} borderRadius="lg">
            <Text fontSize="xl" fontWeight="medium">
              {currentQuestion.question}
            </Text>
          </Box>

          <RadioGroup
            onChange={handleOptionSelect}
            value={currentAnswer?.selectedOption || ''}
          >
            <VStack spacing={4} align="stretch">
              {[
                { key: 'A', value: currentQuestion.optionA },
                { key: 'B', value: currentQuestion.optionB },
                { key: 'C', value: currentQuestion.optionC },
                { key: 'D', value: currentQuestion.optionD },
              ].map((option) => (
                <Radio
                  key={option.key}
                  value={option.key}
                  size="lg"
                  p={4}
                  borderWidth={1}
                  borderRadius="md"
                  _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
                  colorScheme="purple"
                >
                  <Text fontSize="lg">{option.key}. {option.value}</Text>
                </Radio>
              ))}
            </VStack>
          </RadioGroup>

          <HStack justify="space-between" pt={4}>
            <Button
              onClick={handlePrevious}
              isDisabled={currentQuestionIndex === 0}
              colorScheme="gray"
              size="lg"
              leftIcon={<Text>←</Text>}
            >
              Previous
            </Button>
            
            <Button
              onClick={handleNext}
              colorScheme="purple"
              size="lg"
              rightIcon={<Text>→</Text>}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Review Answers' : 'Next'}
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  };

  // Warning Banner Component
  const WarningBanner = () => (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bg="red.500"
      color="white"
      px={4}
      py={3}
      zIndex={9999}
      transform={showWarningBanner ? "translateY(0)" : "translateY(-100%)"}
      transition="transform 0.3s ease-in-out"
      boxShadow="0 2px 4px rgba(0,0,0,0.2)"
    >
      <Container maxW="container.lg">
        <Flex align="center" justify="space-between">
          <Text fontWeight="medium">{warningMessage}</Text>
          <Text fontWeight="bold">
            Warning {warningCount}/{MAX_WARNINGS}
          </Text>
        </Flex>
      </Container>
    </Box>
  );

  // Simple and robust camera initialization
  const initializeCamera = async () => {
    try {
      const constraints = {
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraError(null);
    } catch (error) {
      console.error('Camera initialization error:', error);
      setCameraError('Failed to access camera');
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Initialize camera on component mount
  useEffect(() => {
    initializeCamera();

    // Cleanup function
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle video element errors
  const handleVideoError = (error: any) => {
    console.error('Video element error:', error);
    setCameraError('Video playback error');
    // Attempt to reinitialize camera
    initializeCamera();
  };

  const WebcamFeed = () => (
    <Box
      position="fixed"
      top="20px"
      right="20px"
      width="240px"
      height="180px"
      bg="black"
      borderRadius="md"
      overflow="hidden"
      boxShadow="lg"
      zIndex={1000}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onError={handleVideoError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)'
        }}
      />
      {cameraError && (
        <Flex
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.700"
          color="white"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          p={2}
        >
          <VStack spacing={2}>
            <Text fontSize="sm">Camera Error</Text>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={initializeCamera}
            >
              Retry Camera
            </Button>
          </VStack>
        </Flex>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Container centerContent>
        <WebcamFeed />
        <Text mt={10}>Loading questions...</Text>
      </Container>
    );
  }

  if (showReview) {
    return (
      <>
        <WebcamFeed />
        <Container maxW="container.xl" py={10}>
          <ThemeToggle />
          <Box>
            {renderReviewSection()}
            <WarningModal />
          </Box>
        </Container>
      </>
    );
  }

  if (showResult) {
    return (
      <Container maxW="container.md" py={10}>
        <ThemeToggle />
        {renderFinalResults()}
      </Container>
    );
  }

  return (
    <>
      <WarningBanner />
      <WebcamFeed />
      <Container maxW="container.md" py={10}>
        <ThemeToggle />
        <VStack spacing={6} align="stretch">
          {renderQuiz()}
        </VStack>
      </Container>
    </>
  );
};

export default Quiz; 