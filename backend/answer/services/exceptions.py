class AnswerRejected(Exception):
    code = None
    default_message = ""

    def __init__(self, message=None):
        super().__init__(message or self.default_message)


class ItemAlreadyFinished(AnswerRejected):
    default_message = "Esse item já foi finalizado e não pode mais receber respostas."


class BackgroundFormRequired(AnswerRejected):
    code = "BACKGROUND_REQUIRED"
    default_message = "Você precisa responder o formulário background antes de rotular."


class NoGroupSlotAvailable(AnswerRejected):
    code = "NO_GROUP_SLOT"
    default_message = "Os slots restantes deste item são reservados para outros grupos."


class DecisionInputError(AnswerRejected):
    pass
