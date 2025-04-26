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
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { ThemeToggle } from './ThemeToggle';

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

const TOTAL_TIME = 15 * 60; // 15 minutes in seconds
const MAX_QUESTIONS = 5;
const PASSING_PERCENTAGE = 75;

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

  const handleSubmit = () => {
    setShowReview(false);
    setShowResult(true);
  };

  const handleProceed = () => {
    window.location.href = 'https://ai-interview-platform-2whg2og9v-lalit-shrotriyas-projects.vercel.app/';
  };

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
    const score = calculateScore();
    const passed = score >= PASSING_PERCENTAGE;

    return (
      <Box bg={bgColor} p={8} borderRadius="xl" boxShadow="2xl" maxW="600px" mx="auto">
        <VStack spacing={8}>
          <Heading size="xl" bgGradient="linear(to-r, blue.400, purple.500)" 
                  bgClip="text">Quiz Results</Heading>
          
          <Box textAlign="center" p={6} borderRadius="lg" 
               bg={useColorModeValue(passed ? 'green.50' : 'red.50', 
                                   passed ? 'green.900' : 'red.900')} 
               w="100%">
            <Heading size="md" mb={4} color={passed ? 'green.500' : 'red.500'}>
              {passed ? 'Congratulations! 🎉' : 'Keep Practicing! 💪'}
            </Heading>
            <Text fontSize="4xl" fontWeight="bold" color={passed ? 'green.600' : 'red.600'}>
              {answers.filter(a => a.isCorrect).length} / {questions.length}
            </Text>
            <Text fontSize="2xl" color={passed ? 'green.500' : 'red.500'}>
              {score.toFixed(1)}%
            </Text>
          </Box>

          <Alert status={passed ? "success" : "info"} borderRadius="lg">
            <AlertIcon />
            {passed 
              ? "Great job! You've passed the quiz!" 
              : "Don't worry! Practice makes perfect!"}
          </Alert>

          {passed && (
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

  if (loading) {
    return (
      <Container centerContent>
        <Text mt={10}>Loading questions...</Text>
      </Container>
    );
  }

  if (showReview) {
    return (
      <Container maxW="container.xl" py={10}>
        <ThemeToggle />
        {renderReviewSection()}
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

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);

  return (
    <Container maxW="container.md" py={10}>
      <ThemeToggle />
      <VStack spacing={6} align="stretch">
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
      </VStack>
    </Container>
  );
};

export default Quiz; 