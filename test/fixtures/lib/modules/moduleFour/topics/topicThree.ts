import { ValidatedTopic } from '../../../../../../src'

/**
 * While this topic is in a file called topicThree,
 * we explicitly set the name of the topic here by
 * giving a name to the class
 *
 * @export
 * @class CustomName
 * @extends {ValidatedTopic}
 */
export default class CustomName extends ValidatedTopic {
  public static index = ['topicId']
}
