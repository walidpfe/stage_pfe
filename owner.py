


from google.appengine.api import users
from google.appengine.ext import db


class Owner(db.Model):
  user     = db.UserProperty()
  email    = db.StringProperty()
  nickname = db.StringProperty()
  bOpenNew = db.BooleanProperty()


  # *** Class methods ***

  @classmethod
  def getCurrent(self):
#    query = Owner.gql("WHERE user = :1",
#        users.get_current_user())
#
#    owner = query.get()
    owner = Owner.all().filter('user = ',
        users.get_current_user()).get()

    return owner

  # *** End class methods ***

