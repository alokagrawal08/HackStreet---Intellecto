import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
} from '@chakra-ui/react';

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  warningCount: number;
  maxWarnings: number;
}

export const WarningModal: React.FC<WarningModalProps> = ({
  isOpen,
  onClose,
  warningCount,
  maxWarnings,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader color="red.500">Warning!</ModalHeader>
      <ModalBody>
        <Text>
          Changing tabs or leaving the quiz window is not allowed!
          Warning {warningCount} of {maxWarnings}.
        </Text>
      </ModalBody>
      <ModalFooter>
        <Button colorScheme="red" onClick={onClose}>
          I Understand
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
); 