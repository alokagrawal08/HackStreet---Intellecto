import React, { useState, useEffect, useCallback } from 'react';
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
  ScaleFade,
  Tooltip,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useRouter } from 'next/router';
import { ThemeToggle } from './ThemeToggle';
import { WarningIcon, CheckCircleIcon, TimeIcon, QuestionIcon } from '@chakra-ui/icons';

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

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const Quiz: React.FC = () => {
  const router = useRouter();
  const { role } = router.query;
  const { setColorMode } = useColorMode();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const toast = useToast();
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

  // Set dark mode as default when component mounts
  useEffect(() => {
    setColorMode('dark');
  }, []);

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
      // Use "FullStack (Web)" as default if no role is provided
      const defaultRole = "FullStack (Web)";
      const currentRole = role || defaultRole;
      const encodedRole = encodeURIComponent(currentRole as string);
      
      const response = await fetch(`https://jm-ebg-cdp.el.r.appspot.com/api/questions?role=${encodedRole}`);
      const data = await response.json();
      
      // Randomly select questions
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
    // Always fetch questions, even if role is not provided
    fetchQuestions();
  }, [role]); // Still keep role in dependencies to refetch if it changes

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
    const gradientBg = useColorModeValue(
      'linear(to-r, blue.400, purple.500)',
      'linear(to-r, blue.600, purple.700)'
    );

    return (
      <Box 
        bg={useColorModeValue('white', 'gray.800')} 
        p={8} 
        borderRadius="2xl" 
        boxShadow="2xl" 
        maxW="900px" 
        mx="auto"
        position="relative"
        overflow="hidden"
        _before={{
          content: '""',
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          right: '-2px',
          height: '4px',
          bgGradient: gradientBg,
        }}
      >
        <VStack spacing={8} align="stretch">
          <Heading 
            size="xl" 
            textAlign="center" 
            bgGradient={gradientBg}
            bgClip="text"
            letterSpacing="tight"
          >
            Review Your Answers
          </Heading>
          
          <Box overflowX="auto">
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
                    <Tr 
                      key={question.id}
                      _hover={{
                        bg: useColorModeValue('gray.50', 'gray.700'),
                        transition: 'all 0.2s',
                      }}
                    >
                      <Td fontWeight="bold">{index + 1}</Td>
                      <Td maxW="400px" whiteSpace="normal">{question.question}</Td>
                      <Td>
                        {answer?.selectedOption || 
                          <Badge colorScheme="red" p={2} borderRadius="md">
                            Not answered
                          </Badge>
                        }
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={answer?.isCorrect ? 'green' : 'red'}
                          p={2}
                          borderRadius="md"
                          display="flex"
                          alignItems="center"
                          gap={2}
                        >
                          {answer?.isCorrect ? 
                            <><CheckCircleIcon /> Correct</> :
                            <><WarningIcon /> Incorrect</>
                          }
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>

          <Button
            colorScheme="purple"
            size="lg"
            onClick={handleSubmit}
            mt={6}
            bgGradient={gradientBg}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'xl',
              transition: 'all 0.2s',
            }}
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
    const gradientBg = useColorModeValue(
      'linear(to-r, blue.400, purple.500)',
      'linear(to-r, blue.600, purple.700)'
    );

    return (
      <Box 
        bg={useColorModeValue('white', 'gray.800')} 
        p={8} 
        borderRadius="2xl" 
        boxShadow="2xl" 
        maxW="600px" 
        mx="auto"
        position="relative"
        overflow="hidden"
        _before={{
          content: '""',
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          right: '-2px',
          height: '4px',
          bgGradient: gradientBg,
        }}
      >
        <VStack spacing={8}>
          <Heading 
            size="xl" 
            bgGradient={gradientBg}
            bgClip="text"
            letterSpacing="tight"
          >
            {isDisqualified ? 'Disqualified' : 'Quiz Results'}
          </Heading>
          
          <Box 
            textAlign="center" 
            p={8} 
            borderRadius="xl" 
            bg={useColorModeValue(
              isDisqualified ? 'red.50' : passed ? 'green.50' : 'red.50',
              isDisqualified ? 'red.900' : passed ? 'green.900' : 'red.900'
            )} 
            w="100%"
            boxShadow="inner"
          >
            <Heading 
              size="lg" 
              mb={6} 
              color={isDisqualified ? 'red.500' : passed ? 'green.500' : 'red.500'}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={3}
            >
              {isDisqualified ? 
                <><WarningIcon /> You have been disqualified</> : 
                passed ? <><CheckCircleIcon /> Congratulations! 🎉</> : 
                <><QuestionIcon /> Keep Practicing! 💪</>}
            </Heading>
            {!isDisqualified && (
              <VStack spacing={4}>
                <Text 
                  fontSize="5xl" 
                  fontWeight="bold" 
                  color={passed ? 'green.600' : 'red.600'}
                >
                  {answers.filter(a => a.isCorrect).length} / {questions.length}
                </Text>
                <Text 
                  fontSize="3xl" 
                  color={passed ? 'green.500' : 'red.500'}
                  fontWeight="semibold"
                >
                  {score.toFixed(1)}%
                </Text>
              </VStack>
            )}
          </Box>

          <Alert 
            status={isDisqualified ? "error" : passed ? "success" : "info"} 
            borderRadius="lg"
            p={6}
          >
            <AlertIcon boxSize="6" />
            <Text fontSize="lg" fontWeight="medium">
              {isDisqualified 
                ? "You have been disqualified for violating quiz rules."
                : passed ? "Great job! You've passed the quiz!" 
                : "Don't worry! Practice makes perfect!"}
            </Text>
          </Alert>

          {passed && !isDisqualified && (
            <Button
              colorScheme="purple"
              size="lg"
              onClick={handleProceed}
              w="full"
              bgGradient={gradientBg}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                transition: 'all 0.2s',
              }}
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
    const gradientBg = useColorModeValue(
      'linear(to-r, blue.400, purple.500)',
      'linear(to-r, blue.600, purple.700)'
    );

    return (
      <>
        <Box
          position="sticky"
          top="0"
          zIndex="sticky"
          bg={useColorModeValue('white', 'gray.800')}
          borderBottom="1px"
          borderColor={useColorModeValue('gray.100', 'gray.700')}
          py={4}
          px={8}
          mb={6}
          boxShadow="sm"
        >
          <Flex 
            justify="space-between" 
            align="center" 
            maxW="container.md" 
            mx="auto"
            wrap="wrap"
            gap={4}
          >
            <Badge
              size="lg"
              px={4}
              py={2}
              borderRadius="full"
              colorScheme="purple"
              fontSize="md"
              fontWeight="bold"
              bgGradient={gradientBg}
              color="white"
            >
              Role: {role || "FullStack (Web)"}
            </Badge>
            <HStack spacing={4}>
              <Tooltip label="Time remaining" placement="bottom">
                <Badge
                  animation={timeLeft < 60 ? `${pulse} 2s infinite` : 'none'}
                  colorScheme={timeLeft < 60 ? 'red' : 'green'}
                  p={3}
                  borderRadius="lg"
                  fontSize="lg"
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <TimeIcon />
                  {formatTime(timeLeft)}
                </Badge>
              </Tooltip>
              <Badge
                colorScheme="blue"
                p={3}
                borderRadius="lg"
                fontSize="lg"
              >
                {currentQuestionIndex + 1}/{questions.length}
              </Badge>
            </HStack>
          </Flex>
          <Progress
            value={((currentQuestionIndex + 1) / questions.length) * 100}
            size="sm"
            colorScheme="purple"
            borderRadius="full"
            hasStripe
            isAnimated
            mt={4}
          />
        </Box>

        <Box 
          bg={useColorModeValue('white', 'gray.800')}
          p={8}
          borderRadius="2xl"
          boxShadow="2xl"
          border="1px"
          borderColor={useColorModeValue('gray.100', 'gray.700')}
          position="relative"
          overflow="hidden"
          _before={{
            content: '""',
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            right: '-2px',
            height: '4px',
            bgGradient: gradientBg,
          }}
        >
          <VStack spacing={8} align="stretch">
            <ScaleFade in={true} initialScale={0.9}>
              <Heading 
                size="lg" 
                bgGradient={gradientBg}
                bgClip="text"
                letterSpacing="tight"
              >
                Question {currentQuestionIndex + 1}
              </Heading>
            </ScaleFade>

            <Box 
              p={8} 
              bg={useColorModeValue('gray.50', 'gray.700')} 
              borderRadius="xl"
              boxShadow="inner"
              position="relative"
              _hover={{ transform: 'translateY(-2px)', transition: 'all 0.2s' }}
            >
              <Text 
                fontSize="xl" 
                fontWeight="medium"
                lineHeight="tall"
              >
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
                    p={6}
                    borderWidth={2}
                    borderRadius="lg"
                    _hover={{
                      bg: useColorModeValue('gray.50', 'gray.700'),
                      transform: 'translateX(8px)',
                      transition: 'all 0.2s',
                    }}
                    _checked={{
                      bg: useColorModeValue('purple.50', 'purple.900'),
                      borderColor: 'purple.500',
                    }}
                    colorScheme="purple"
                  >
                    <Text fontSize="lg" fontWeight="medium">
                      {option.key}. {option.value}
                    </Text>
                  </Radio>
                ))}
              </VStack>
            </RadioGroup>

            <HStack justify="space-between" pt={6}>
              <Button
                onClick={handlePrevious}
                isDisabled={currentQuestionIndex === 0}
                size="lg"
                variant="outline"
                colorScheme="purple"
                leftIcon={<Text>←</Text>}
                _hover={{
                  transform: 'translateX(-4px)',
                  transition: 'all 0.2s',
                }}
              >
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                size="lg"
                colorScheme="purple"
                rightIcon={<Text>→</Text>}
                bgGradient={gradientBg}
                _hover={{
                  transform: 'translateX(4px)',
                  transition: 'all 0.2s',
                }}
              >
                {currentQuestionIndex === questions.length - 1 ? 'Review Answers' : 'Next'}
              </Button>
            </HStack>
          </VStack>
        </Box>
      </>
    );
  };

  // Warning Banner Component with enhanced styling
  const WarningBanner = () => (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bg="red.500"
      color="white"
      px={4}
      py={4}
      zIndex={9999}
      transform={showWarningBanner ? "translateY(0)" : "translateY(-100%)"}
      transition="transform 0.3s ease-in-out"
      boxShadow="lg"
    >
      <Container maxW="container.lg">
        <Flex align="center" justify="space-between">
          <HStack spacing={3}>
            <WarningIcon w={5} h={5} />
            <Text fontSize="lg" fontWeight="medium">{warningMessage}</Text>
          </HStack>
          <Badge
            colorScheme="red"
            variant="solid"
            fontSize="md"
            p={2}
            borderRadius="md"
          >
            Warning {warningCount}/{MAX_WARNINGS}
          </Badge>
        </Flex>
      </Container>
    </Box>
  );

  if (loading) {
    return (
      <Container centerContent py={20}>
        <VStack spacing={6}>
          <Progress size="xs" w="200px" isIndeterminate colorScheme="purple" />
          <Text fontSize="lg">Loading questions...</Text>
        </VStack>
      </Container>
    );
  }

  if (showReview) {
    return (
      <Container maxW="container.xl" py={10}>
        <ThemeToggle />
        <Box>
          {renderReviewSection()}
          <WarningModal />
        </Box>
      </Container>
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