import type { NextPage } from 'next'
import { Container, Heading } from '@chakra-ui/react'
import Quiz from '../components/Quiz'

const Home: NextPage = () => {
  return (
    <Container maxW="container.lg" py={8}>
      <Heading textAlign="center" mb={8}>MCQ Quiz</Heading>
      <Quiz />
    </Container>
  )
}

export default Home 