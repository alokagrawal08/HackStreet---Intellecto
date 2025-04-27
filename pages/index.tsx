import type { NextPage } from 'next'
import { Container, Heading } from '@chakra-ui/react'
import Quiz from '../components/Quiz'

const Home: NextPage = () => {
  return (
    <Container maxW="container.md" py={10}>
      <Heading 
        textAlign="center" 
        mb={8}
        bgGradient="linear(to-r, blue.400, purple.500)"
        bgClip="text"
        letterSpacing="tight"
        fontSize="4xl"
      >
        Intellecto Online Assessment
      </Heading>
      <Quiz />
    </Container>
  )
}

export default Home 